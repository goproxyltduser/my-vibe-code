// src/app/api/dvnet-webhook/route.js
import { NextResponse } from 'next/server';
// Импортируем функцию создания клиента напрямую, чтобы создать админ-клиент
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
    try {
        // 1. СОЗДАЕМ АДМИНСКОГО КЛИЕНТА (Bypass RLS)
        // Используем Service Role Key, чтобы игнорировать правила безопасности
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
        
        // Получаем ID и статус
        const clientId = data.wallet?.store_external_id || data.external_id; 
        const status = data.status;

        if (status === 'completed' && clientId) {
            
            // 2. Ищем заказ (Используем Admin-клиент)
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

            console.log(`Обработка заказа: ${order.id}, Тип: ${order.product_name}`);

            // 3. ОБРАБОТКА: ЭТО ПОПОЛНЕНИЕ БАЛАНСА
            if (order.product_name === 'Пополнение баланса') {
                // Получаем текущий баланс
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('balance')
                    .eq('id', order.user_id)
                    .single();
                
                // Рассчитываем новый баланс
                const currentBalance = profile?.balance || 0;
                const newBalance = currentBalance + order.amount_total;

                // Обновляем баланс (Admin-клиент игнорирует RLS!)
                const { error: updateProfileError } = await supabaseAdmin
                    .from('profiles')
                    .update({ balance: newBalance })
                    .eq('id', order.user_id);

                if (updateProfileError) {
                    console.error("Ошибка пополнения баланса:", updateProfileError);
                    return NextResponse.json({ error: 'Profile Update Failed' }, { status: 500 });
                }

                console.log(`Баланс пользователя ${order.user_id} успешно пополнен на ${order.amount_total}`);
            } 
            // 4. ОБРАБОТКА ПОКУПКИ ПРОКСИ
            else {
                // (Логика автовыдачи будет использовать supabaseAdmin аналогично)
                 // ... пока пропускаем для теста баланса
            }

            // 5. Финальное обновление статуса заказа на PAID
            const { error: updateOrderError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'paid', payment_details: data })
                .eq('id', order.id);

            if (updateOrderError) {
                 console.error("Ошибка обновления статуса заказа:", updateOrderError);
            }
            
            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ message: 'Ignored' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}


