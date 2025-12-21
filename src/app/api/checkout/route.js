// src/app/api/checkout/route.js
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

const DVNET_DOMAIN = 'https://cloud.dv.net';
const DVNET_STORE_ID = 'c90fa863-b9fb-450f-93e0-736df5ed22c2';

const LAVA_SHOP_ID = process.env.LAVA_SHOP_ID;
const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;
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
            // Проверяем, есть ли юзер
            const { data: existingUser } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                // Создаем нового. 
                // ВАЖНО: redirectTo ведет на страницу, которая обработает вход
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    redirectTo: `${DOMAIN}/profile` 
                });
                
                if (createError) {
                    // Если ошибка "User already registered", пробуем найти его снова
                    // (Иногда бывает гонка запросов)
                    const { data: retryUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
                    if (retryUser) finalUserId = retryUser.id;
                    else return NextResponse.json({ error: 'Ошибка регистрации: ' + createError.message }, { status: 400 });
                } else {
                    finalUserId = newUser.user.id;
                }
            }
        }

        // Страховка: если юзер авторизован, но email не пришел с фронта
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
            // Нормализуем страну (ru, kz, us)
            country: country ? country.toLowerCase() : 'ru', 
            type: product.name?.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type,
            provider,
            customer_email: finalEmail
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
       
        // 3. ГЕНЕРАЦИЯ ССЫЛКИ
        let paymentUrl = '';
        const amount = (amountCents / 100).toFixed(2);
        
        // URL успеха - ведет на страницу успеха, где мы покажем "Спасибо"
        const successUrl = `${DOMAIN}/success?amount=${amount}&order_id=${client_id}`;
        
        if (provider === 'lava') {
            // === LAVA ===
            if (!LAVA_SHOP_ID || !LAVA_SECRET_KEY) return NextResponse.json({ error: 'Lava config missing' }, { status: 500 });

            // Курс (хардкод 100 или запрос)
            let exchangeRate = 100;
            try {
                const rateRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { next: { revalidate: 3600 } });
                if (rateRes.ok) {
                    const rateData = await rateRes.json();
                    exchangeRate = rateData.Valute.USD.Value;
                }
            } catch (e) {}

            const rubAmount = parseFloat((parseFloat(amount) * exchangeRate).toFixed(2));

            const payload = {
                sum: rubAmount,
                orderId: client_id,
                shopId: LAVA_SHOP_ID,
                successUrl: successUrl,
                failUrl: `${DOMAIN}/profile`,
                hookUrl: `${DOMAIN}/api/webhook/lava` // Лава иногда требует свой путь, но у нас универсальный dvnet-webhook тоже ловит json
            };
            // ПРИМЕЧАНИЕ: Если ты используешь dvnet-webhook как универсальный, можно указать его:
            // hookUrl: `${DOMAIN}/api/dvnet-webhook` 

            const signature = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(JSON.stringify(payload)).digest('hex');

            const lavaResponse = await fetch('https://api.lava.ru/business/invoice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Signature': signature },
                body: JSON.stringify(payload)
            });

            const lavaResult = await lavaResponse.json();
            if (lavaResult.data?.url) paymentUrl = lavaResult.data.url;
            else return NextResponse.json({ error: 'Lava Error' }, { status: 400 });

        } else {
            // === DV.NET ===
            const encodedReturnUrl = encodeURIComponent(successUrl);
            paymentUrl = `${DVNET_DOMAIN}/pay/store/${DVNET_STORE_ID}/${client_id}?amount=${amount}&return_url=${encodedReturnUrl}`;
        }

        return NextResponse.json({ url: paymentUrl });

    } catch (error) {
        console.error('Checkout API Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

