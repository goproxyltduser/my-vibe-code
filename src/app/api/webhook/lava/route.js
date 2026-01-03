// src/app/api/webhook/lava/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Секретный ключ друга (для автовыдачи)
const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";
// Секретный ключ Lava (из .env)
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

        // 1. ПРОВЕРКА ПОДПИСИ (Lava)
        // Lava считает HMAC SHA256 от тела запроса
        const mySign = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(bodyText).digest('hex');

        if (signature !== mySign) {
            console.error('Lava: Неверная подпись!');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // 2. ИЩЕМ ЗАКАЗ
        // Lava присылает наш ID в поле orderId
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('session_id', data.orderId) 
            .single();

        if (!order) {
            console.error('Заказ не найден:', data.orderId);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status === 'paid') {
            return NextResponse.json({ status: 'ok' });
        }

        // Проверяем статус оплаты (success или completed)
        if (data.status !== 'success' && data.status !== 'completed') {
            return NextResponse.json({ status: 'ok' }); // Игнорируем другие статусы
        }

        // 3. ОБНОВЛЯЕМ СТАТУС НА PAID (Сразу!)
        await supabaseAdmin
            .from('orders')
            .update({ 
                status: 'paid', 
                payment_details: { provider: 'lava', ...data } 
            })
            .eq('id', order.id);

        console.log("Lava: Статус PAID установлен. Выдача...");

        // ============================================================
        // 4. ПАРТНЕРСКАЯ ПРОГРАММА
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
        // 5. АВТОВЫДАЧА (С фиксом toLowerCase)
        // ============================================================
        try {
            if (order.product_name.includes('Пополнение')) {
                // Пополнение баланса
                const { data: p } = await supabaseAdmin.from('profiles').select('balance').eq('id', order.user_id).single();
                await supabaseAdmin.from('profiles').update({ balance: (p?.balance || 0) + order.amount_total }).eq('id', order.user_id);
            } else {
                // Прокси
                const rawCountry = order.metadata?.country || 'ru';
                
                // ВАЖНО: Приводим к маленьким буквам для друга (us, ru, kz)
                const targetPrefix = rawCountry.toLowerCase(); 
                
                // Определяем срок действия
const period = parseInt(order.metadata?.period) || 1;
const unit = order.metadata?.unit || 'months'; // 'days' или 'months'

let hours;
if (unit === 'days') {
    hours = period * 24; // Если 3 дня, то 3 * 24 = 72 часа
} else {
    hours = period * 30 * 24; // По умолчанию месяцы
}


                const qty = parseInt(order.metadata?.quantity) || 1;

                console.log(`Lava Auto-Issue: ${targetPrefix}`);

                const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-Secret": PROXY_API_SECRET
                    },
                    body: JSON.stringify({
                        user_id: `${order.user_id}_${order.session_id}`,
                        proxy_type: "http",
                        duration_hours: hours,
                        traffic_limit_mb: 0,
                        count: qty, 
                        country_prefix: targetPrefix // Отправляем маленькие буквы
                    })
                });

                if (proxyResponse.ok) {
                    const result = await proxyResponse.json();
                    if (!result.error) {
                        await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
                        console.log(`Прокси ${targetPrefix} выданы.`);
                    }
                }
            }
        } catch (e) { console.error("Автовыдача ошибка:", e); }

        return NextResponse.json({ status: 'ok' });

    } catch (e) {
        console.error('Lava Error:', e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

