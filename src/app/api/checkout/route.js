import { sendAdminNotification } from '@/lib/telegram';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// -- КОНФИГУРАЦИЯ SUPABASE --
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// -- ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ --
const LAVA_SHOP_ID = process.env.LAVA_SHOP_ID;
const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;
const FREEKASSA_SHOP_ID = process.env.FREEKASSA_SHOP_ID;
const FREEKASSA_SECRET_1 = process.env.FREEKASSA_SECRET_1;
const DOMAIN = 'https://goproxy.tech';

// === НАСТРОЙКИ ЦЕН И СКИДОК (SERVER-SIDE) ===

// 1. Базовые цены за 1 шт в месяц (USD)
const BASE_PRICE_IPV4 = 2.39;
const BASE_PRICE_IPV6 = 0.29; // 2.90$ за 10 шт -> 0.29$ за 1 шт

// 2. Цены на тестовые периоды (USD) - Фиксированные
const TRIAL_PRICES = {
    '3': 0.49, // за 3 дня
    '5': 0.79  // за 5 дней
};

export async function POST(req) {
    try {
        const body = await req.json();
        
        // Извлекаем параметры. Цену клиента (body.price) ИГНОРИРУЕМ полностью.
        const {
            product = {},        // product.name нужно для определения типа
            quantity = 1,
            period = 1,
            country = '',
            userId,
            email,
            type = 'order',      // 'order' или 'topup'
            provider = 'freekassa',
            referralId,
            unit = 'months',     // 'days' или 'months'
            amountCents          // Только для пополнения баланса
        } = body;

        let finalUserId = userId;
        let finalEmail = email;

        // ============================================================
        // 1. АВТОРИЗАЦИЯ / РЕГИСТРАЦИЯ
        // ============================================================
        if (!finalUserId && email) {
            const { data: existingUser } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    redirectTo: `${DOMAIN}/profile`
                });
                if (createError) {
                    const { data: retryUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
                    if (retryUser) finalUserId = retryUser.id;
                    else return NextResponse.json({ error: 'Auth Error' }, { status: 400 });
                } else {
                    finalUserId = newUser.user.id;
                }
            }
        }

        if (finalUserId && !finalEmail) {
             const { data: u } = await supabaseAdmin.auth.admin.getUserById(finalUserId);
             finalEmail = u?.user?.email;
        }

        if (!finalUserId) return NextResponse.json({ error: 'User undefined' }, { status: 400 });

        // Реферальная система
        if (referralId && finalUserId && referralId !== finalUserId) {
            try {
                await supabaseAdmin.from('profiles').update({ referred_by: referralId }).eq('id', finalUserId).is('referred_by', null);
            } catch (e) {}
        }

        // ============================================================
        // 2. КУРС ВАЛЮТ
        // ============================================================
        let exchangeRate = 95;
        try {
            const rateRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { next: { revalidate: 3600 } });
            if (rateRes.ok) {
                const rateData = await rateRes.json();
                exchangeRate = rateData.Valute.USD.Value;
            }
        } catch (e) {
            console.error('Ошибка ЦБ, берем резервный курс:', exchangeRate);
        }

        // ============================================================
        // 3. БЕЗОПАСНЫЙ РАСЧЕТ СУММЫ (USD)
        // ============================================================
        
        let calculatedUsd = 0;
        let productName = '';
        
        // Валидация входных данных
        const safeQty = Math.max(1, parseInt(quantity) || 1);
        const safePeriod = Math.max(1, parseInt(period) || 1);
        const productNameLower = product.name ? product.name.toLowerCase() : '';

        if (type === 'topup') {
            // --- ПОПОЛНЕНИЕ БАЛАНСА ---
            // amountCents приходит в центах USD. Проверяем минимум 1$
            const requestedUsd = parseInt(amountCents) / 100;
            if (requestedUsd < 1) {
                return NextResponse.json({ error: 'Минимальное пополнение: 1$' }, { status: 400 });
            }
            calculatedUsd = requestedUsd;
            productName = 'Пополнение баланса';

        } else if (unit === 'days' || productNameLower.includes('trial')) {
            // --- ТЕСТОВЫЙ ПЕРИОД (Trial) ---
            // Логика взята из TrialCard
            // period здесь равен количеству дней (3 или 5)
            
            const trialPrice = TRIAL_PRICES[safePeriod.toString()];
            
            if (!trialPrice) {
                // Если кто-то пытается купить "2 дня" или "10 дней", чего нет в меню
                return NextResponse.json({ error: 'Неверный срок тестового периода' }, { status: 400 });
            }
            
            calculatedUsd = trialPrice; // Цена фиксирована, количество всегда 1
            productName = `IPv4 Trial (${safePeriod} days)`;

        } else {
            // --- ОБЫЧНАЯ ПОКУПКА (IPv4 / IPv6) ---
            
            const isIPv6 = productNameLower.includes('ipv6');
            let basePricePerUnit = isIPv6 ? BASE_PRICE_IPV6 : BASE_PRICE_IPV4;
            let discountPercent = 0;

            // 1. Расчет объемной скидки (Volume Discount)
            if (isIPv6) {
                // IPv6: скидка 5% за каждые 50 шт
                const rawDiscount = Math.floor(safeQty / 50) * 5;
                discountPercent = Math.min(rawDiscount, 40); // Максимум 40%
            } else {
                // IPv4: скидка 5% за каждые 5 шт
                const rawDiscount = Math.floor(safeQty / 5) * 5;
                discountPercent = Math.min(rawDiscount, 40); // Максимум 40%
            }

            // 2. Базовая стоимость (Цена * Кол-во)
            const baseCost = basePricePerUnit * safeQty;

            // 3. Применяем объемную скидку
            const discountFactor = (100 - discountPercent) / 100;
            const costWithVolumeDiscount = baseCost * discountFactor;

            // 4. Расчет скидки за период (Period Discount)
            // 3 мес = 5%, 6 мес = 10%
            let periodDiscount = 0;
            if (safePeriod === 3) periodDiscount = 0.05;
            if (safePeriod === 6) periodDiscount = 0.10;

            // 5. Итоговая формула (как в PricingCard)
            // (Цена со скидкой за объем) * Период * (Скидка за период)
            calculatedUsd = costWithVolumeDiscount * safePeriod * (1 - periodDiscount);

            // Округляем до 2 знаков
            calculatedUsd = Math.round(calculatedUsd * 100) / 100;
            productName = product.name || (isIPv6 ? 'IPv6 Proxy' : 'IPv4 Proxy');
        }

        // Конвертация в рубли для платежки
        const amountRub = (calculatedUsd * exchangeRate).toFixed(2);
        const amountTotalCents = Math.round(calculatedUsd * 100); // Для БД

        console.log(`SECURE CALC: ${productName} (Qty:${safeQty}, Per:${safePeriod}). Total: ${calculatedUsd}$ (${amountRub} RUB)`);

        // ============================================================
        // 4. СОЗДАНИЕ ЗАКАЗА В БД
        // ============================================================
        const client_id = uuidv4();
        
        const metadata = {
            quantity: safeQty,
            period: safePeriod,
            country: country ? country.toLowerCase() : 'ru',
            type: productName.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type,
            provider,
            customer_email: finalEmail,
            unit
        };
        
        const orderData = {
            user_id: finalUserId,
            product_name: productName,
            amount_total: amountTotalCents, // Сохраняем USD центы
            status: 'pending',
            session_id: client_id,
            metadata
        };

        const { error: orderError } = await supabaseAdmin.from('orders').insert([orderData]);
        if (orderError) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
// ОТПРАВКА УВЕДОМЛЕНИЯ В ТГ
        try {
            await sendAdminNotification(
                `🆕 <b>Создан заказ</b> (${provider})\n` +
                `👤 Email: ${finalEmail}\n` +
                `📦 Товар: ${productName}\n` +
                `💰 Сумма: $${calculatedUsd} (~${amountRub} RUB)\n` +
                `🆔 ID: <code>${client_id}</code>`
            );
        } catch (e) { console.error('TG notify error:', e); }

        // ============================================================
        // 5. ГЕНЕРАЦИЯ ССЫЛКИ
        // ============================================================
        const successUrl = `${DOMAIN}/success?amount=${calculatedUsd}&order_id=${client_id}`;
        let paymentUrl = '';

        if (provider === 'lava') {
            if (!LAVA_SHOP_ID || !LAVA_SECRET_KEY) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

            const payload = {
                sum: parseFloat(amountRub),
                orderId: client_id,
                shopId: LAVA_SHOP_ID,
                successUrl: successUrl,
                failUrl: `${DOMAIN}/profile`,
                hookUrl: `${DOMAIN}/api/webhook/lava`
            };

            const signature = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(JSON.stringify(payload)).digest('hex');

            const lavaResponse = await fetch('https://api.lava.ru/business/invoice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Signature': signature },
                body: JSON.stringify(payload)
            });

            const lavaResult = await lavaResponse.json();
            if (lavaResult.data?.url) paymentUrl = lavaResult.data.url;
            else return NextResponse.json({ error: 'Lava Error' }, { status: 400 });

        } else if (provider === 'freekassa') {
            if (!FREEKASSA_SHOP_ID || !FREEKASSA_SECRET_1) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

            const currency = 'RUB';
            const signSource = `${FREEKASSA_SHOP_ID}:${amountRub}:${FREEKASSA_SECRET_1}:${currency}:${client_id}`;
            const signature = crypto.createHash('md5').update(signSource).digest('hex');

            paymentUrl = `https://pay.freekassa.ru/?m=${FREEKASSA_SHOP_ID}&oa=${amountRub}&o=${client_id}&s=${signature}&currency=${currency}&em=${finalEmail}`;
        }

        return NextResponse.json({ url: paymentUrl });

    } catch (error) {
        console.error('Checkout API Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

