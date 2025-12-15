// src/app/api/dvnet-webhook/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Секретный ключ твоего друга для выдачи
const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";

export async function POST(req) {
    try {
        // 1. СОЗДАЕМ АДМИНСКОГО КЛИЕНТА
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const data = await req.json();
        console.log("Webhook data:", data);
       
        // Получаем ID заказа. DVNet шлет store_external_id или external_id
        const clientId = data.wallet?.store_external_id || data.external_id || data.order_id || data.custom_id;
        const status = data.status; // 'completed', 'paid', 'success'

        // Проверка на успешный статус
        if ((status === 'completed' || status === 'success' || status === 'paid' || status === 2) && clientId) {
           
            // 2. Ищем заказ по session_id
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

            console.log(`Обработка заказа: ${order.id}, Страна: ${order.metadata?.country}`);

            let proxyData = null; 

            // 3. ОБРАБОТКА: ЭТО ПОПОЛНЕНИЕ БАЛАНСА
            if (order.product_name === 'Пополнение' || order.product_name === 'Пополнение баланса') {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('balance')
                    .eq('id', order.user_id)
                    .single();
               
                const newBalance = (profile?.balance || 0) + order.amount_total;

                await supabaseAdmin
                    .from('profiles')
                    .update({ balance: newBalance })
                    .eq('id', order.user_id);
                   
                console.log(`Баланс пополнен.`);
            }
           
            // 4. ОБРАБОТКА ПОКУПКИ ПРОКСИ
            else {
                const country = order.metadata?.country || 'ru';

                // --- ВАЖНОЕ ИЗМЕНЕНИЕ: ПРОВЕРКА СТРАНЫ ---
                // Если Казахстан (KZ) - делаем автовыдачу
                if (country.toLowerCase() === 'kz') {
                    console.log("Страна KZ. Начинаем автовыдачу через API друга...");
                    
                    const months = order.metadata?.period || 1;
                    const hours = months * 30 * 24; 
                    const qty = order.metadata?.quantity || 1;

                    try {
                        const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Webhook-Secret": PROXY_API_SECRET
                            },
                            body: JSON.stringify({
                                user_id: `${order.user_id}_${order.session_id}`, // Уникальный ID
                                proxy_type: "http",
                                duration_hours: hours,
                                traffic_limit_mb: 0,
                                count: qty, 
                                country_prefix: "KZ" // Явно указываем KZ
                            })
                        });

                        if (proxyResponse.ok) {
                            const result = await proxyResponse.json();
                            proxyData = result;
                            console.log("Прокси успешно получены!");
                        } else {
                            console.error("Ошибка API прокси:", await proxyResponse.text());
                            // Не ставим proxyData, чтобы статус был paid, но прокси пустые (знак тебе проверить)
                        }
                    } catch (apiErr) {
                        console.error("Сбой запроса к API прокси:", apiErr);
                    }
                } else {
                    console.log(`Страна ${country}. Автовыдача отключена. Ждем ручной выдачи.`);
                    // Мы ничего не делаем, код просто пойдет дальше и поставит статус 'paid'
                }
            }

            // 5. Финальное обновление заказа
            const { error: updateOrderError } = await supabaseAdmin
                .from('orders')
                .update({
                    status: 'paid', // Статус всегда ставим PAID, так как деньги получены
                    payment_details: data,
                    proxy_data: proxyData 
                })
                .eq('id', order.id);

            if (updateOrderError) console.error("Ошибка обновления БД:", updateOrderError);
           
            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ message: 'Ignored' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

