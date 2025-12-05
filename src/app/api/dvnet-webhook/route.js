// src/app/api/dvnet-webhook/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Секретный ключ твоего друга для выдачи
const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";

export async function POST(req) {
    try {
        // 1. СОЗДАЕМ АДМИНСКОГО КЛИЕНТА (Bypass RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const data = await req.json();
        console.log("Webhook data:", data);
        
        // Получаем ID заказа и статус
        // ВНИМАНИЕ: Для Lava тут могут быть другие поля (например data.order_id). 
        // Если используешь DVNet, то store_external_id или external_id верны.
        const clientId = data.wallet?.store_external_id || data.external_id || data.order_id;
        const status = data.status; // 'completed' (DVNet) или 'success' (Lava)

        // Проверка на успешный статус (поддерживаем и DVNet, и Lava)
        if ((status === 'completed' || status === 'success') && clientId) {
            
            // 2. Ищем заказ по session_id (который мы генерировали при оплате)
            const { data: order, error: fetchError } = await supabaseAdmin
                .from('orders')
                .select('*')
                .eq('session_id', clientId)
                .single();

            if (!order) {
                 console.error('Заказ не найден:', clientId);
                 return NextResponse.json({ error: 'Order Not Found' }, { status: 404 });
            }

            if (order.status === 'paid') {
                return NextResponse.json({ message: 'Already processed' });
            }

            console.log(`Обработка заказа: ${order.id}, Продукт: ${order.product_name}`);

            let proxyData = null; // Сюда сохраним выданные прокси

            // 3. ОБРАБОТКА: ЭТО ПОПОЛНЕНИЕ БАЛАНСА
            if (order.product_name === 'Пополнение' || order.product_name === 'Пополнение баланса') {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('balance')
                    .eq('id', order.user_id)
                    .single();
                
                const currentBalance = profile?.balance || 0;
                const newBalance = currentBalance + order.amount_total;

                await supabaseAdmin
                    .from('profiles')
                    .update({ balance: newBalance })
                    .eq('id', order.user_id);
                    
                console.log(`Баланс пополнен.`);
            }
            
            // 4. ОБРАБОТКА ПОКУПКИ ПРОКСИ (ЗАПРОС К ДРУГУ)
            else {
                console.log("Начинаем автовыдачу через API друга...");

                // 4.1. Подготовка данных
                const months = order.metadata?.period || 1;
                const hours = months * 30 * 24; // Переводим месяцы в часы
                const qty = order.metadata?.quantity || 1; // Количество прокси

                // 4.2. Делаем запрос к API
                try {
                    const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Webhook-Secret": PROXY_API_SECRET
                        },
                        body: JSON.stringify({
                            user_id: order.user_id, // Привязываем к ID юзера
                            proxy_type: "http",     // Стандарт
                            duration_hours: hours,  // Расчетное время
                            traffic_limit_mb: 0,    // Безлимит
                            count: qty,             // ВАЖНО: Просим выдать нужное кол-во, а не 1
                            country: order.metadata?.country || 'ru' // Передаем страну из заказа
                        })
                    });

                    if (proxyResponse.ok) {
                        const result = await proxyResponse.json();
                        // Сохраняем то, что ответил сервер (список прокси)
                        proxyData = result; 
                        console.log("Прокси успешно получены!");
                    } else {
                        console.error("Ошибка API прокси:", await proxyResponse.text());
                        proxyData = { error: "Ошибка выдачи на стороне провайдера. Обратитесь в поддержку." };
                    }
                } catch (apiErr) {
                    console.error("Сбой запроса к API прокси:", apiErr);
                    proxyData = { error: "Сбой соединения с провайдером." };
                }
            }

            // 5. Финальное обновление заказа
            // Ставим статус paid и сохраняем данные прокси в metadata или специальное поле
            const { error: updateOrderError } = await supabaseAdmin
                .from('orders')
                .update({ 
                    status: 'paid', 
                    payment_details: data, // Данные от платежки
                    proxy_data: proxyData  // ВАЖНО: Сохраняем выданные прокси сюда!
                })
                .eq('id', order.id);

            if (updateOrderError) {
                 console.error("Ошибка обновления БД:", updateOrderError);
            }
            
            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ message: 'Ignored' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

