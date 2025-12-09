// src/app/api/purchase/route.js - ФИНАЛ: ПРАВИЛЬНАЯ ЛОГИКА СТРАН
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

        // Приводим код страны к нижнему регистру для проверки
        // (Приходит 'ru', 'us', 'kz' и т.д.)
        const targetCountry = country ? country.toLowerCase() : 'ru';

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

        // 2. СПИСЫВАЕМ СРЕДСТВА
        const newBalance = profile.balance - amountCents;
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (updateError) return NextResponse.json({ error: 'Ошибка списания' }, { status: 500 });

        // 3. СОЗДАЕМ ЗАКАЗ (Пока processing)
        const sessionId = uuidv4();
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: userId,
                product_name: product.name,
                amount_total: amountCents,
                status: 'processing', 
                session_id: sessionId,
                metadata: { quantity, period, country: targetCountry, type: 'balance_purchase' }
            }])
            .select()
            .single();

        if (orderError) return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });

        // 4. ЛОГИКА ВЫДАЧИ
        console.log(`Покупка с баланса. Страна: ${targetCountry}`);
        
        let proxyData = null;
        let isSuccess = false;
        let errorMessage = "Unknown error";
        
        // --- ВЕТВЛЕНИЕ ЛОГИКИ ---
        
        // ТОЛЬКО ЕСЛИ КАЗАХСТАН -> ИДЕМ К ДРУГУ
        if (targetCountry === 'kz') {
            console.log("Страна KZ -> Запрашиваем автовыдачу...");
            try {
                const hours = period * 30 * 24;
                
                const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-Secret": PROXY_API_SECRET
                    },
                    body: JSON.stringify({
                        // Хак с ID для уникальности
                        user_id: `${userId}_${sessionId}`, 
                        
                        // ИСПРАВЛЕНО: передаем правильный параметр, как просил друг
                        country_prefix: "KZ", 
                        
                        proxy_type: "http",
                        duration_hours: hours,
                        traffic_limit_mb: 0
                        // count: quantity // Если друг не поддерживает count, уберем. Но лучше оставить, если поддерживает.
                    })
                });

                if (proxyResponse.ok) {
                    proxyData = await proxyResponse.json();
                    isSuccess = true;
                    console.log("Автовыдача KZ успешна!");
                } else {
                    const errText = await proxyResponse.text();
                    errorMessage = `API Error: ${errText}`;
                    console.error(errorMessage);
                    // isSuccess остается false, деньги вернутся
                }
            } catch (e) {
                errorMessage = `Network Error: ${e.message}`;
                console.error(errorMessage);
            }
        } 
        // ЕСЛИ ЛЮБАЯ ДРУГАЯ СТРАНА -> РУЧНАЯ ВЫДАЧА
        else {
            console.log(`Страна ${targetCountry} -> Ручной режим. Прокси не запрашиваем.`);
            isSuccess = true; // Считаем покупку успешной
            proxyData = null; // Прокси нет, выдашь руками
        }

        // 5. ФИНАЛИЗАЦИЯ
        if (isSuccess) {
            // УСПЕХ (Либо KZ выдался, либо ручной заказ создан)
            console.log("Завершаем заказ как PAID...");
            
            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'paid', proxy_data: proxyData })
                .eq('id', order.id);

            if (updateError) {
                return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 });
            }

            return NextResponse.json({ success: true, newBalance });

        } else {
            // ОШИБКА (Только если сломалась автовыдача KZ)
            console.log("⚠️ Ошибка автовыдачи KZ. Возвращаем средства...");

            // Возврат денег
            const { data: currentProfile } = await supabaseAdmin.from('profiles').select('balance').eq('id', userId).single();
            const refundBalance = (currentProfile?.balance || 0) + amountCents;

            await supabaseAdmin
                .from('profiles')
                .update({ balance: refundBalance })
                .eq('id', userId);

            // Отмена заказа
            await supabaseAdmin
                .from('orders')
                .update({ status: 'failed', metadata: { ...order.metadata, error: errorMessage } })
                .eq('id', order.id);

            return NextResponse.json({ error: 'Ошибка автовыдачи (нет в наличии). Средства возвращены.' }, { status: 500 });
        }

    } catch (error) {
        console.error('Purchase Error:', error);
        return NextResponse.json({ error: 'Critical Server Error' }, { status: 500 });
    }
}

