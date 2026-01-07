//src/app/api/webhook/lava/route.js
import { sendAdminNotification } from '@/lib/telegram';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// !!! Секретный ключ PROXY API (лучше перенеси его в .env, но пока оставил тут)
const PROXY_API_SECRET = process.env.PROXY_API_SECRET;
const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;

export async function POST(req) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        const bodyText = await req.text();
        if (!bodyText) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
        
        const data = JSON.parse(bodyText);
        const signature = req.headers.get('signature');

        console.log(`Lava Webhook: Order ${data.orderId}, Status ${data.status}`);

        // 1. ПРОВЕРКА ПОДПИСИ
        const mySign = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(bodyText).digest('hex');
        if (signature !== mySign) {
            console.error('Lava: Неверная подпись!');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // 2. ИЩЕМ ЗАКАЗ
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('session_id', data.orderId)
            .single();

        if (!order) {
            console.error('Заказ не найден:', data.orderId);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Если уже оплачен - просто отвечаем ОК
        if (order.status === 'paid') {
            return NextResponse.json({ status: 'ok' });
        }

        // Проверяем статус транзакции от Lava
        if (data.status !== 'success' && data.status !== 'completed') {
            return NextResponse.json({ status: 'ok' }); 
        }
   try {
            await sendAdminNotification(
                `✅ <b>ОПЛАТА LAVA!</b>\n` +
                `💰 Сумма: ${data.amount} RUB\n` +
                `🆔 Заказ: <code>${data.orderId}</code>`
            );
        } catch (e) {}

        return NextResponse.json({ status: 'ok' });

        // 3. ОБНОВЛЯЕМ СТАТУС ЗАКАЗА
        await supabaseAdmin
            .from('orders')
            .update({
                status: 'paid',
                payment_details: { provider: 'lava', ...data }
            })
            .eq('id', order.id);

        console.log("Lava: Оплата прошла. Начинаем выдачу...");

        // ============================================================
        // 4. ПАРТНЕРСКАЯ ПРОГРАММА (Копия рабочей логики)
        // ============================================================
        try {
            const { data: buyerProfile } = await supabaseAdmin
                .from('profiles')
                .select('referred_by')
                .eq('id', order.user_id)
                .single();

            if (buyerProfile && buyerProfile.referred_by) {
                const { count } = await supabaseAdmin
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', order.user_id)
                    .eq('status', 'paid');
                
                // Если это первая покупка - 20%, иначе 10%
                const isFirstPurchase = count === 1;
                const percent = isFirstPurchase ? 20 : 10;
                
                const orderAmountUsd = order.amount_total / 100;
                const commission = orderAmountUsd * (percent / 100);

                if (commission > 0) {
                    const { data: partnerProfile } = await supabaseAdmin
                        .from('profiles')
                        .select('affiliate_balance')
                        .eq('id', buyerProfile.referred_by)
                        .single();
                    
                    await supabaseAdmin
                        .from('profiles')
                        .update({ affiliate_balance: (partnerProfile?.affiliate_balance || 0) + commission })
                        .eq('id', buyerProfile.referred_by);

                    await supabaseAdmin.from('referral_earnings').insert([{
                        partner_id: buyerProfile.referred_by,
                        source_user_id: order.user_id,
                        amount: commission,
                        order_amount: orderAmountUsd,
                        percentage: percent,
                        status: 'completed'
                    }]);
                }
            }
        } catch (e) { console.error("Партнерка ошибка:", e); }

        // ============================================================
        // 5. АВТОВЫДАЧА (Полная копия логики баланса)
        // ============================================================
        try {
            // Проверка: это пополнение баланса или покупка товара?
            if (order.product_name && order.product_name.includes('Пополнение')) {
                const { data: p } = await supabaseAdmin.from('profiles').select('balance').eq('id', order.user_id).single();
                await supabaseAdmin.from('profiles').update({ balance: (p?.balance || 0) + order.amount_total }).eq('id', order.user_id);
                console.log(`Lava: Баланс пополнен для ${order.user_id}`);
            } else {
                // ВЫДАЧА ПРОКСИ
                
                // 1. Извлекаем данные из метадаты заказа
                const metadata = order.metadata || {};
                const safeCountry = metadata.country ? metadata.country.toLowerCase() : 'ru';
                const quantity = parseInt(metadata.quantity) || 1;
                
                // 2. Расчет времени (как в балансе)
                const period = parseInt(metadata.period) || 1;
                const unit = metadata.unit || 'months'; // по умолчанию месяцы
                
                let hours;
                if (unit === 'days') {
                    hours = period * 24;
                } else {
                    hours = period * 30 * 24;
                }

                console.log(`Lava: Запрос прокси. Country: ${safeCountry}, Hours: ${hours}, Qty: ${quantity}`);

                // 3. Запрос к поставщику
                const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-Secret": PROXY_API_SECRET
                    },
                    body: JSON.stringify({
                        // Формируем уникальный ID так же, как в балансе (userId_sessionId)
                        user_id: `${order.user_id}_${order.session_id}`,
                        proxy_type: "http",
                        duration_hours: hours,
                        traffic_limit_mb: 0,
                        count: quantity,
                        country_prefix: safeCountry // Важно: маленькие буквы
                    })
                });

                if (proxyResponse.ok) {
                    const result = await proxyResponse.json();
                    if (!result.error) {
                        // Сохраняем данные прокси в заказ
                        await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
                        console.log(`Lava: Прокси успешно выданы и сохранены в заказ ${order.id}`);
                    } else {
                        console.error("Lava Proxy API Error (Logic):", result.error);
                    }
                } else {
                    console.error("Lava Proxy API Error (Network):", proxyResponse.status);
                    const errText = await proxyResponse.text();
                    console.error("Response:", errText);
                }
            }
        } catch (e) { 
            console.error("Автовыдача ошибка (Catch):", e); 
        }

        return NextResponse.json({ status: 'ok' });

    } catch (e) {
        console.error('Lava Global Error:', e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

