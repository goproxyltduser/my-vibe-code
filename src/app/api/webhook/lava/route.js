import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendAdminNotification } from '@/lib/telegram';

const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;

export async function POST(req) {
    try {
        const body = await req.json(); // Lava шлет JSON
        const signature = req.headers.get('Signature'); // Подпись в заголовке

        // 1. ПРОВЕРКА ПОДПИСИ
        if (!LAVA_SECRET_KEY || !signature) {
            return NextResponse.json({ error: 'No secret' }, { status: 400 });
        }

        const generatedSignature = crypto
            .createHmac('sha256', LAVA_SECRET_KEY)
            .update(JSON.stringify(body))
            .digest('hex');

        if (generatedSignature !== signature) {
            console.error("Lava Signature mismatch!");
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // 2. РАЗБОР ДАННЫХ
        // Lava может слать разную структуру, но обычно это:
        // { orderId: '...', status: 'success', amount: 100, ... }
        const { orderId, status, amount } = body;

        if (status !== 'success' && status !== 'completed') {
            return NextResponse.json({ status: 'ignored' });
        }

        // 3. ПОИСК ЗАКАЗА В БД
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Ищем заказ по session_id (мы его передавали как orderId)
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('session_id', orderId)
            .single();

        if (orderError || !order) {
            console.error('Order not found:', orderId);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Проверка на дубль (если уже оплачен)
        if (order.status === 'paid') {
            return NextResponse.json({ status: 'already_paid' });
        }

        // 4. ОБНОВЛЕНИЕ СТАТУСА НА PAID
        await supabaseAdmin
            .from('orders')
            .update({ status: 'paid', payment_details: body })
            .eq('id', order.id);

        // 5. ТЕЛЕГРАМ УВЕДОМЛЕНИЕ
        try {
            await sendAdminNotification(
                `✅ <b>ОПЛАТА LAVA!</b>\n` +
                `💰 Сумма: ${amount} RUB\n` +
                `📦 Товар: ${order.product_name}\n` +
                `🆔 Заказ: <code>${orderId}</code>`
            );
        } catch (e) {}

        // 6. ПАРТНЕРСКАЯ ПРОГРАММА (Начисление рефереру)
        try {
             const { data: profile } = await supabaseAdmin.from('profiles').select('referred_by').eq('id', order.user_id).single();
             if (profile?.referred_by) {
                const { count } = await supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', order.user_id).eq('status', 'paid');
                // Если это первый заказ (count == 1, т.к. мы только что обновили статус), то 20%, иначе 10%
                // Но лучше проверить, были ли РАНЬШЕ оплаченные.
                // Упрощенно: считаем комиссию от USD суммы заказа в базе.
                const percent = (count <= 1) ? 20 : 10;
                const orderAmountUsd = (order.amount_total || 0) / 100;
                const commission = orderAmountUsd * (percent / 100);

                if (commission > 0) {
                     const { data: partner } = await supabaseAdmin.from('profiles').select('affiliate_balance').eq('id', profile.referred_by).single();
                     await supabaseAdmin.from('profiles').update({ affiliate_balance: (partner?.affiliate_balance || 0) + commission }).eq('id', profile.referred_by);
                     await supabaseAdmin.from('referral_earnings').insert([{
                        partner_id: profile.referred_by, source_user_id: order.user_id, amount: commission, order_amount: orderAmountUsd, percentage: percent, status: 'completed'
                    }]);
                }
             }
        } catch (e) { console.error('Ref Error:', e); }


        // 7. АВТОВЫДАЧА (Самое главное!)
        try {
            const metadata = order.metadata || {};
            const quantity = metadata.quantity || 1;
            const period = metadata.period || 1;
            const unit = metadata.unit || 'months';
            const countryPrefix = metadata.country || 'ru';

            let hours;
            if (unit === 'days') {
                hours = period * 24; 
            } else {
                hours = period * 30 * 24; 
            }

            console.log(`Lava Auto-Issue: ${countryPrefix} (${quantity} pcs, ${hours}h)`);

            const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": process.env.PROXY_API_SECRET
                },
                body: JSON.stringify({
                    user_id: `${order.user_id}_${orderId}`,
                    proxy_type: "http",
                    duration_hours: hours,
                    traffic_limit_mb: 0,
                    count: quantity,
                    country_prefix: countryPrefix
                })
            });

            if (proxyResponse.ok) {
                const result = await proxyResponse.json();
                if (!result.error) {
                    await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
                }
            } else {
                console.error('Proxy API failed:', await proxyResponse.text());
            }

        } catch (e) {
            console.error('Auto-issue Error:', e);
        }

        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error('Lava Webhook Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

