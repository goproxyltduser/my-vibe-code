import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// -- КОНФИГУРАЦИЯ --
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Переменные окружения
const LAVA_SHOP_ID = process.env.LAVA_SHOP_ID;
const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;
const FREEKASSA_SHOP_ID = process.env.FREEKASSA_SHOP_ID;
const FREEKASSA_SECRET_1 = process.env.FREEKASSA_SECRET_1; // Обязательно проверь это в .env!
const DOMAIN = 'https://goproxy.tech';

export async function POST(req) {
    try {
        const {
            product = {},
            quantity = 0,
            period = 0,
            country = '',
            amountCents,
            userId,
            email,
            type = 'order',
            provider = 'dvnet',
            referralId
        } = await req.json();

        let finalUserId = userId;
        let finalEmail = email;

        // 1. АВТОРЕГИСТРАЦИЯ (Если гость)
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
                    else return NextResponse.json({ error: 'Ошибка регистрации: ' + createError.message }, { status: 400 });
                } else {
                    finalUserId = newUser.user.id;
                }
            }
        }

        if (finalUserId && !finalEmail) {
             const { data: u } = await supabaseAdmin.auth.admin.getUserById(finalUserId);
             finalEmail = u?.user?.email;
        }

        if (!finalUserId) return NextResponse.json({ error: 'Не удалось определить пользователя' }, { status: 400 });

        // --- ПРИВЯЗКА РЕФЕРАЛА ---
        if (referralId && finalUserId && referralId !== finalUserId) {
            try {
                await supabaseAdmin
                    .from('profiles')
                    .update({ referred_by: referralId })
                    .eq('id', finalUserId)
                    .is('referred_by', null);
            } catch (e) {}
        }

        // 2. СОЗДАЕМ ЗАКАЗ
        const client_id = uuidv4();
        
        const metadata = {
            quantity,
            period,
            country: country ? country.toLowerCase() : 'ru',
            type: product.name?.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type,
            provider,
            customer_email: finalEmail
            // unit: 'months' // <-- Если у тебя есть выбор дней/месяцев, добавь это поле с фронтенда
        };
        
        const orderData = {
            user_id: finalUserId,
            product_name: type === 'topup' ? 'Пополнение' : (product.name || 'Unknown'),
            amount_total: amountCents,
            status: 'pending',
            session_id: client_id,
            metadata
        };

        const { error: orderError } = await supabaseAdmin.from('orders').insert([orderData]);
        if (orderError) return NextResponse.json({ error: 'Ошибка БД: ' + orderError.message }, { status: 500 });
        
        // 3. КОНВЕРТАЦИЯ В РУБЛИ
        let paymentUrl = '';
        const amountUsd = (amountCents / 100).toFixed(2);
        
        let exchangeRate = 100; // Фолбек курс
        try {
            const rateRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { next: { revalidate: 3600 } });
            if (rateRes.ok) {
                const rateData = await rateRes.json();
                exchangeRate = rateData.Valute.USD.Value;
            }
        } catch (e) { console.error('Ошибка курса ЦБ:', e); }

        const amountRub = (parseFloat(amountUsd) * exchangeRate).toFixed(2);
        const successUrl = `${DOMAIN}/success?amount=${amountUsd}&order_id=${client_id}`;

        // === ВЫБОР ПЛАТЕЖКИ ===

        if (provider === 'lava') {
            // === LAVA ===
            if (!LAVA_SHOP_ID || !LAVA_SECRET_KEY) return NextResponse.json({ error: 'Lava config missing' }, { status: 500 });

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
            else return NextResponse.json({ error: 'Lava Error: ' + JSON.stringify(lavaResult) }, { status: 400 });

        } else if (provider === 'freekassa') {
            // === FREEKASSA (Метод генерации ссылки, самый надежный) ===
            if (!FREEKASSA_SHOP_ID || !FREEKASSA_SECRET_1) {
                return NextResponse.json({ error: 'FreeKassa config missing' }, { status: 500 });
            }

            // Формула: md5(merchant_id:amount:secret1:currency:order_id)
            const currency = 'RUB';
            const signSource = `${FREEKASSA_SHOP_ID}:${amountRub}:${FREEKASSA_SECRET_1}:${currency}:${client_id}`;
            const signature = crypto.createHash('md5').update(signSource).digest('hex');

            // Формируем ссылку на оплату
            // em - email пользователя, чтобы чек ушел ему
            paymentUrl = `https://pay.freekassa.ru/?m=${FREEKASSA_SHOP_ID}&oa=${amountRub}&o=${client_id}&s=${signature}&currency=${currency}&em=${finalEmail}`;
        }

        return NextResponse.json({ url: paymentUrl });

    } catch (error) {
        console.error('Checkout API Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

