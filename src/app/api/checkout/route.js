import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendAdminNotification } from '@/lib/telegram';

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
const BASE_PRICE_IPV4 = 2.39;
const BASE_PRICE_IPV6 = 0.29; // Цена за 1 шт (при условии мин заказа 10 шт)
const TRIAL_PRICES = {
    '3': 0.49,
    '5': 0.79
};

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            product = {},
            quantity = 1,
            period = 1,
            country = '',
            userId,
            email,
            type = 'order',
            provider = 'freekassa',
            referralId,
            unit = 'months',
            amountCents
        } = body;

        let finalUserId = userId;
        let finalEmail = email;

        // ============================================================
        // 1. АВТОРИЗАЦИЯ / РЕГИСТРАЦИЯ
        // ============================================================
        if (!finalUserId && email) {
            const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: `${DOMAIN}/profile` });
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
            try { await supabaseAdmin.from('profiles').update({ referred_by: referralId }).eq('id', finalUserId).is('referred_by', null); } catch (e) {}
        }

        // ============================================================
        // 2. КУРС ВАЛЮТ
        // ============================================================
        let exchangeRate = 95;
        try {
            const rateRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { next: { revalidate: 3600 } });
            if (rateRes.ok) { const rateData = await rateRes.json(); exchangeRate = rateData.Valute.USD.Value; }
        } catch (e) {}

        // ============================================================
        // 3. БЕЗОПАСНЫЙ РАСЧЕТ СУММЫ (USD)
        // ============================================================
        let calculatedUsd = 0;
        let productName = '';
        
        // Валидация и защита входных данных
        let safeQty = Math.max(1, parseInt(quantity) || 1);
        const safePeriod = Math.max(1, parseInt(period) || 1);
        const productNameLower = product.name ? product.name.toLowerCase() : '';

        if (type === 'topup') {
            // --- ПОПОЛНЕНИЕ БАЛАНСА ---
            const requestedUsd = parseInt(amountCents) / 100;
            if (requestedUsd < 1) return NextResponse.json({ error: 'Минимальное пополнение: 1$' }, { status: 400 });
            calculatedUsd = requestedUsd;
            productName = 'Пополнение баланса';

        } else if (unit === 'days' || productNameLower.includes('trial')) {
            // --- ТЕСТОВЫЙ ПЕРИОД ---
            const trialPrice = TRIAL_PRICES[safePeriod.toString()];
            if (!trialPrice) return NextResponse.json({ error: 'Неверный срок' }, { status: 400 });
            calculatedUsd = trialPrice;
            productName = `IPv4 Trial (${safePeriod} days)`;

        } else {
            // --- ОБЫЧНАЯ ПОКУПКА ---
            const isIPv6 = productNameLower.includes('ipv6');

            // !!! ИСПРАВЛЕНИЕ: ПРИНУДИТЕЛЬНО СТАВИМ МИНИМУМ 10 ШТ ДЛЯ IPv6 !!!
            if (isIPv6 && safeQty < 10) {
                safeQty = 10;
            }
            
            let basePricePerUnit = isIPv6 ? BASE_PRICE_IPV6 : BASE_PRICE_IPV4;
            let discountPercent = 0;

            // Скидка за объем
            if (isIPv6) {
                const rawDiscount = Math.floor(safeQty / 50) * 5;
                discountPercent = Math.min(rawDiscount, 40);
            } else {
                const rawDiscount = Math.floor(safeQty / 5) * 5;
                discountPercent = Math.min(rawDiscount, 40);
            }

            const baseCost = basePricePerUnit * safeQty;
            const costWithVolumeDiscount = baseCost * ((100 - discountPercent) / 100);

            // Скидка за период
            let periodDiscount = 0;
            if (safePeriod === 3) periodDiscount = 0.05;
            if (safePeriod === 6) periodDiscount = 0.10;

            calculatedUsd = costWithVolumeDiscount * safePeriod * (1 - periodDiscount);
            calculatedUsd = Math.round(calculatedUsd * 100) / 100;
            productName = product.name || (isIPv6 ? 'IPv6 Proxy' : 'IPv4 Proxy');
        }

        // Конвертация в рубли
        const amountRub = (calculatedUsd * exchangeRate).toFixed(2);
        const amountTotalCents = Math.round(calculatedUsd * 100);

        // ============================================================
        // 4. СОЗДАНИЕ ЗАКАЗА В БД
        // ============================================================
        const client_id = uuidv4();
        const metadata = {
            quantity: safeQty, // Сохраняем исправленное (минимум 10)
            period: safePeriod,
            country: country ? country.toLowerCase() : 'ru',
            type: productNameLower.includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type,
            provider, customer_email: finalEmail, unit
        };
        
        const { error: orderError } = await supabaseAdmin.from('orders').insert([{
            user_id: finalUserId,
            product_name: productName,
            amount_total: amountTotalCents,
            status: 'pending',
            session_id: client_id,
            metadata
        }]);

        if (orderError) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

        // ОТПРАВКА УВЕДОМЛЕНИЯ В ТГ (О создании заявки)
        try {
            await sendAdminNotification(
                `🆕 <b>Создан заказ</b> (${provider})\n` +
                `👤 Email: ${finalEmail}\n` +
                `📦 Товар: ${productName} (${safeQty} шт)\n` +
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
            const payload = { sum: parseFloat(amountRub), orderId: client_id, shopId: LAVA_SHOP_ID, successUrl, failUrl: `${DOMAIN}/profile`, hookUrl: `${DOMAIN}/api/webhook/lava` };
            const signature = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(JSON.stringify(payload)).digest('hex');
            const lavaResponse = await fetch('https://api.lava.ru/business/invoice/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Signature': signature }, body: JSON.stringify(payload) });
            const lavaResult = await lavaResponse.json();
            if (lavaResult.data?.url) paymentUrl = lavaResult.data.url; else return NextResponse.json({ error: 'Lava Error' }, { status: 400 });

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

