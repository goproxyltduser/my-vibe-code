// src/app/api/dvnet-webhook/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Секретный ключ твоего друга
const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";

export async function POST(req) {
    // 1. Инициализация (Admin права)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        const data = await req.json();
        console.log("Webhook data received:", JSON.stringify(data));
       
        // Получаем ID заказа из всех возможных полей (универсально для Lava и DVNet)
        const clientId = data.wallet?.store_external_id || data.external_id || data.order_id || data.custom_id;
        // Статус может быть строкой или числом (в разных платежках по-разному)
        const status = data.status; 

        // Проверяем успешность оплаты
        const isPaid = status === 'completed' || status === 'success' || status === 'paid' || status === 2;

        if (isPaid && clientId) {
            console.log(`Оплата прошла для заказа: ${clientId}`);

            // 2. Ищем заказ в базе
            const { data: order, error: fetchError } = await supabaseAdmin
                .from('orders')
                .select('*')
                .eq('session_id', clientId)
                .single();

            if (!order) {
                 console.error('CRITICAL: Заказ не найден в базе!', clientId);
                 // Отвечаем 200, чтобы платежка успокоилась и не слала повторы
                 return NextResponse.json({ message: 'Order not found, but acknowledged' });
            }

            if (order.status === 'paid') {
                console.log('Заказ уже обработан ранее.');
                return NextResponse.json({ message: 'Already processed' });
            }

            // --- БРОНЕБОЙНОЕ РЕШЕНИЕ: СНАЧАЛА СОХРАНЯЕМ СТАТУС ---
            // Мы обновляем статус на PAID прямо сейчас. 
            // Это гарантирует, что заказ не зависнет в Pending, даже если дальше будет ошибка API прокси.
            await supabaseAdmin
                .from('orders')
                .update({ 
                    status: 'paid', 
                    payment_details: data 
                })
                .eq('id', order.id);
            
            console.log("СТАТУС ОБНОВЛЕН НА PAID. Начинаем выдачу...");

            // ============================================================
            // 1. ПАРТНЕРСКИЕ НАЧИСЛЕНИЯ (Изолированы в try/catch)
            // ============================================================
            try {
                const { data: buyerProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('referred_by')
                    .eq('id', order.user_id)
                    .single();

                if (buyerProfile && buyerProfile.referred_by) {
                    // Проверяем, первая ли это покупка (count=1, так как мы только что поставили paid)
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
                        // Начисляем на баланс партнера
                        const { data: partnerProfile } = await supabaseAdmin
                            .from('profiles')
                            .select('affiliate_balance')
                            .eq('id', buyerProfile.referred_by)
                            .single();
                        
                        await supabaseAdmin
                            .from('profiles')
                            .update({ affiliate_balance: (partnerProfile?.affiliate_balance || 0) + commission })
                            .eq('id', buyerProfile.referred_by);

                        // Пишем лог
                        await supabaseAdmin.from('referral_earnings').insert([{
                            partner_id: buyerProfile.referred_by,
                            source_user_id: order.user_id,
                            amount: commission,
                            order_amount: orderAmountUsd,
                            percentage: percent,
                            status: 'completed'
                        }]);
                        console.log(`Партнерка: +$${commission} начислено.`);
                    }
                }
            } catch (refError) {
                console.error("Ошибка в блоке партнерки (не критично):", refError);
            }

            // ============================================================
            // 2. ВЫДАЧА ТОВАРА (АВТОВЫДАЧА)
            // ============================================================
            try {
                // ВАРИАНТ А: ПОПОЛНЕНИЕ БАЛАНСА
                if (order.product_name === 'Пополнение' || order.product_name === 'Пополнение баланса') {
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('balance')
                        .eq('id', order.user_id)
                        .single();
                    
                    await supabaseAdmin
                        .from('profiles')
                        .update({ balance: (profile?.balance || 0) + order.amount_total })
                        .eq('id', order.user_id);
                    console.log(`Баланс пользователя пополнен.`);
                }
                
                // ВАРИАНТ Б: ПРОКСИ
                else {
                    // 1. Берем страну ИЗ ЗАКАЗА (metadata)
                    const rawCountry = order.metadata?.country || 'ru';
                    
                    // 2. Превращаем её в код для API (us -> US, kz -> KZ, de -> DE)
                    const targetPrefix = rawCountry.toUpperCase(); 

                    console.log(`Автовыдача: Запрос к провайдеру на страну ${targetPrefix}...`);
                    
                    const months = parseInt(order.metadata?.period) || 1;
                    const hours = months * 30 * 24; 
                    const qty = parseInt(order.metadata?.quantity) || 1;

                    // 3. Отправляем запрос ДРУГУ с КОНКРЕТНОЙ страной
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
                            country_prefix: targetPrefix // <--- ПЕРЕДАЕМ ТОЧНУЮ СТРАНУ ИЗ ЗАКАЗА
                        })
                    });

                    if (proxyResponse.ok) {
                        const result = await proxyResponse.json();
                        if (result.error) {
                            console.log(`Провайдер ответил ошибкой: ${result.error}. Прокси не выданы, но статус PAID.`);
                        } else {
                            // УСПЕХ! Сохраняем полученные прокси
                            await supabaseAdmin
                                .from('orders')
                                .update({ proxy_data: result })
                                .eq('id', order.id);
                            console.log(`Ура! Прокси ${targetPrefix} получены и сохранены.`);
                        }
                    } else {
                        console.log(`Провайдер вернул статус ${proxyResponse.status} (возможно, нет в наличии).`);
                    }
                }
            } catch (prodError) {
                console.error("Ошибка автовыдачи (выдай вручную):", prodError);
            }
           
            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ message: 'Ignored' });

    } catch (error) {
        console.error('WebHook Fatal Error:', error);
        // Отвечаем 200, чтобы не зацикливать платежку ошибками
        return NextResponse.json({ error: 'Internal Error' }, { status: 200 });
    }
}

