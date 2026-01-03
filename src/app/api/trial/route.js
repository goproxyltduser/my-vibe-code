// src/app/api/trial/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const PROXY_API_SECRET = "ebcdca5ab698991b9b5670425d3e7ad20e56888740bb996f0f48051d35650e69";

export async function POST(req) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        // ДОБАВИЛИ country в деструктуризацию
        const { userId, country } = await req.json(); 

        // Защита: если страну не прислали, ставим ru
        const targetCountry = country ? country.toLowerCase() : 'ru';

        // 1. Проверяем юзера
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('has_used_trial')
            .eq('id', userId)
            .single();

        if (error || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        if (profile.has_used_trial) {
            return NextResponse.json({ error: 'Вы уже использовали пробный период' }, { status: 403 });
        }

        // 2. Создаем заказ
        const sessionId = uuidv4();
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: userId,
                product_name: 'IPv4 Trial (24h)',
                amount_total: 0,
                status: 'paid',
                session_id: sessionId,
                payment_details: { method: 'trial' },
                metadata: {
                    quantity: 1,
                    period: 1,
                    unit: 'days',
                    country: targetCountry, // <--- Записываем выбранную страну
                    type: 'IPv4'
                }
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Выдаем прокси
        const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Webhook-Secret": PROXY_API_SECRET
            },
            body: JSON.stringify({
                user_id: `${userId}_${sessionId}`,
                proxy_type: "http",
                duration_hours: 24,
                traffic_limit_mb: 0,
                count: 1, 
                country_prefix: targetCountry // <--- Отправляем правильную страну другу
            })
        });

        const result = await proxyResponse.json();

        // 4. Обновляем БД
        await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
        
        await supabaseAdmin
            .from('profiles')
            .update({ has_used_trial: true })
            .eq('id', userId);

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error('Trial Error:', e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

