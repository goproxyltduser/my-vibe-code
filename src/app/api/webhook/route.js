// src/app/api/webhook/freekassa/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Секретный ключ твоего друга для автовыдачи
const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";
// Секретное слово #2 из настроек FreeKassa
const FK_SECRET_2 = process.env.FREEKASSA_SECRET_2;

export async function POST(req) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        // FreeKassa шлет данные в формате x-www-form-urlencoded
        const formData = await req.formData();
        const merchant_id = formData.get('MERCHANT_ID');
        const amount = formData.get('AMOUNT');
        const intid = formData.get('intid');
        const merchant_order_id = formData.get('MERCHANT_ORDER_ID'); // Наш order ID (UUID)
        const sign = formData.get('SIGN'); // Их подпись

        console.log(`FreeKassa Webhook: Order ${merchant_order_id}, Amount ${amount}`);

        // 1. ПРОВЕРКА ПОДПИСИ (Безопасность)
        // Формула: md5(MERCHANT_ID:AMOUNT:SECRET_2:MERCHANT_ORDER_ID)
        const signatureString = `${merchant_id}:${amount}:${FK_SECRET_2}:${merchant_order_id}`;
        const mySign = crypto.createHash('md5').update(signatureString).digest('hex');

        if (mySign !== sign) {
            console.error('FreeKassa: Неверная подпись!', { received: sign, expected: mySign });
            return new NextResponse('Wrong Sign', { status: 400 });
        }

        // 2. ИЩЕМ ЗАКАЗ
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('session_id', merchant_order_id) // session_id у нас хранит UUID заказа
            .single();

        if (!order) {
            console.error('Заказ не найден:', merchant_order_id);
            return new NextResponse('Order not found', { status: 400 });
        }

        if (order.status === 'paid') {
            return new NextResponse('YES', { status: 200 }); // FreeKassa ждет "YES"
        }

        // 3. ОБНОВЛЯЕМ СТАТУС НА PAID (Сразу!)
        await supabaseAdmin
            .from('orders')
            .update({ 
                status: 'paid', 
                payment_details: { provider: 'freekassa', intid, amount } 
            })
            .eq('id', order.id);

        console.log("Статус PAID установлен. Запуск логики выдачи...");

        // ============================================================
        // 4. ПАРТНЕРСКАЯ ПРОГРАММА (Копия твоей логики)
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
        // 5. АВТОВЫДАЧА (ИСПРАВЛЕННАЯ ПОД НОВЫЕ ТРЕБОВАНИЯ)
        // ============================================================
        try {
            if (order.product_name.includes('Пополнение')) {
                // Пополнение баланса
                const { data: p } = await supabaseAdmin.from('profiles').select('balance').eq('id', order.user_id).single();
                await supabaseAdmin.from('profiles').update({ balance: (p?.balance || 0) + order.amount_total }).eq('id', order.user_id);
            } else {
                // Прокси
                const rawCountry = order.metadata?.country || 'ru';
                
                // ВАЖНОЕ ИСПРАВЛЕНИЕ: Друг принимает маленькие буквы (ru, us, kz)
                // Мы принудительно делаем toLowerCase(), чтобы автовыдача работала.
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

                console.log(`Автовыдача: запрос ${targetPrefix} (qty: ${qty}, hours: ${hours})`);

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
                        country_prefix: targetPrefix // Отправляем 'ru', 'us', 'kz' и т.д.
                    })
                });

                if (proxyResponse.ok) {
                    const result = await proxyResponse.json();
                    if (!result.error) {
                        await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
                        console.log(`Прокси ${targetPrefix} успешно выданы.`);
                    } else {
                        console.error(`Ошибка провайдера: ${result.error}`);
                    }
                } else {
                    console.error(`Ошибка HTTP провайдера: ${proxyResponse.status}`);
                }
            }
        } catch (e) { console.error("Автовыдача ошибка:", e); }

        return new NextResponse('YES', { status: 200 });

    } catch (e) {
        console.error('FreeKassa Error:', e);
        return new NextResponse('Error', { status: 500 });
    }
}

