// src/app/api/purchase/route.js - БЕЗОПАСНАЯ ВЕРСИЯ (С ВОЗВРАТОМ)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req) {
    try {
        const { userId, product, quantity, period, country, amountCents } = await req.json();

        if (!userId || !amountCents) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // 1. ПРОВЕРЯЕМ БАЛАНС
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single();

        if (profileError || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (profile.balance < amountCents) {
            return NextResponse.json({ error: 'Недостаточно средств на балансе' }, { status: 400 });
        }

        // 2. СПИСЫВАЕМ СРЕДСТВА (Временно)
        const newBalance = profile.balance - amountCents;
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (updateError) return NextResponse.json({ error: 'Ошибка списания' }, { status: 500 });

        // 3. СОЗДАЕМ ЗАКАЗ
        const sessionId = uuidv4();
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: userId,
                product_name: product.name,
                amount_total: amountCents,
                status: 'processing', // Пока ставим 'processing', а не 'paid'
                session_id: sessionId,
                metadata: { quantity, period, country, type: 'balance_purchase' }
            }])
            .select()
            .single();

        if (orderError) return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });

        // 4. АВТОВЫДАЧА (ЗАПРОС К ДРУГУ)
        console.log("Покупка с баланса. Запрашиваем прокси...");
        
        let proxyData = null;
        let isSuccess = false;
        let errorMessage = "Unknown error";
        
        try {
            const hours = period * 30 * 24;
            
            const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": PROXY_API_SECRET
                },
                body: JSON.stringify({
                    user_id: userId,
                    proxy_type: "http",
                    duration_hours: hours,
                    traffic_limit_mb: 0,
                    count: quantity,
                    country: country || 'ru'
                })
            });

            if (proxyResponse.ok) {
                proxyData = await proxyResponse.json();
                isSuccess = true;
            } else {
                const errText = await proxyResponse.text();
                errorMessage = `API Error: ${errText}`;
                console.error(errorMessage);
            }
        } catch (e) {
            errorMessage = `Network Error: ${e.message}`;
            console.error(errorMessage);
        }

        // 5. ЛОГИКА УСПЕХА ИЛИ ВОЗВРАТА
               // 5. ЛОГИКА УСПЕХА ИЛИ ВОЗВРАТА
        if (isSuccess && proxyData) {
            // УСПЕХ: Обновляем заказ на PAID
            console.log("API успех. Обновляем БД...");
            
            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'paid', proxy_data: proxyData })
                .eq('id', order.id);

            if (updateError) {
                console.error("ОШИБКА ОБНОВЛЕНИЯ БД:", updateError);
                // Если не смогли обновить статус, возвращаем ошибку клиенту, чтобы видеть
                return NextResponse.json({ error: 'DB Update Failed: ' + updateError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, newBalance });
        }



    } catch (error) {
        console.error('Purchase Error:', error);
        return NextResponse.json({ error: 'Critical Server Error' }, { status: 500 });
    }
}

