import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// -- КОНФИГУРАЦИЯ --
const FREEKASSA_SHOP_ID = process.env.FREEKASSA_SHOP_ID;
// ВАЖНО: Тут используется ИМЕННО ВТОРОЕ секретное слово!
const FREEKASSA_SECRET_2 = process.env.FREEKASSA_SECRET_2; 
const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";

export async function POST(req) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        // FreeKassa присылает данные в формате form-data или x-www-form-urlencoded
        const formData = await req.formData();
        
        const merchant_id = formData.get('MERCHANT_ID');
        const amount = formData.get('AMOUNT');
        const merchant_order_id = formData.get('MERCHANT_ORDER_ID'); // Это твой session_id (uuid)
        const sign = formData.get('SIGN');
        const intid = formData.get('intid'); // Внутренний номер FreeKassa

        console.log(`FK Webhook: Order ${merchant_order_id}, Amount ${amount}`);

        if (!merchant_id || !amount || !merchant_order_id || !sign) {
            return new NextResponse('Error: Missing fields', { status: 400 });
        }

        // 1. ПРОВЕРКА ПОДПИСИ (MD5)
        // Формула оповещения: md5(MERCHANT_ID:AMOUNT:SECRET_2:MERCHANT_ORDER_ID)
        const signSource = `${FREEKASSA_SHOP_ID}:${amount}:${FREEKASSA_SECRET_2}:${merchant_order_id}`;
        const mySign = crypto.createHash('md5').update(signSource).digest('hex');

        if (sign !== mySign) {
            console.error('FK: Неверная подпись! Пришла:', sign, 'Ждали:', mySign);
            // FreeKassa ждет "YES" только при успехе, иначе ошибку
            return new NextResponse('Wrong signature', { status: 400 });
        }

        // 2. ИЩЕМ ЗАКАЗ
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('session_id', merchant_order_id)
            .single();

        if (!order) {
            console.error('FK: Заказ не найден:', merchant_order_id);
            return new NextResponse('Order not found', { status: 404 });
        }

        // Если уже оплачен — просто говорим YES, чтобы FK успокоилась
        if (order.status === 'paid') {
            return new NextResponse('YES');
        }

        // 3. ОБНОВЛЯЕМ СТАТУС
        await supabaseAdmin
            .from('orders')
            .update({
                status: 'paid',
                payment_details: { provider: 'freekassa', intid, amount }
            })
            .eq('id', order.id);

        console.log("FK: Статус PAID установлен. Выдача...");

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
        } catch (e) { console.error("FK Партнерка ошибка:", e); }

        // ============================================================
        // 5. АВТОВЫДАЧА (Прокси или Баланс)
        // ============================================================
        try {
            if (order.product_name && order.product_name.includes('Пополнение')) {
                // Пополнение
                const { data: p } = await supabaseAdmin.from('profiles').select('balance').eq('id', order.user_id).single();
                await supabaseAdmin.from('profiles').update({ balance: (p?.balance || 0) + order.amount_total }).eq('id', order.user_id);
                console.log(`FK: Баланс пополнен для ${order.user_id}`);
            } else {
                // Прокси
                const metadata = order.metadata || {};
                const safeCountry = metadata.country ? metadata.country.toLowerCase() : 'ru';
                const quantity = parseInt(metadata.quantity) || 1;
                
                const period = parseInt(metadata.period) || 1;
                const unit = metadata.unit || 'months'; 
                
                let hours;
                if (unit === 'days') {
                    hours = period * 24;
                } else {
                    hours = period * 30 * 24;
                }

                console.log(`FK: Выдача прокси. Country: ${safeCountry}, Qty: ${quantity}`);

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
                        count: quantity,
                        country_prefix: safeCountry
                    })
                });

                if (proxyResponse.ok) {
                    const result = await proxyResponse.json();
                    if (!result.error) {
                        await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
                        console.log(`FK: Прокси выданы успешно.`);
                    } else {
                        console.error("FK Proxy API Error:", result.error);
                    }
                } else {
                    console.error("FK Proxy HTTP Error:", proxyResponse.status);
                }
            }
        } catch (e) { console.error("FK Auto-issue Error:", e); }

        // !!! ВАЖНО: FreeKassa ждет ответ "YES" текстом !!!
        return new NextResponse('YES');

    } catch (e) {
        console.error('FK Global Error:', e);
        return new NextResponse('Error', { status: 500 });
    }
}

