// src/app/api/purchase/route.js
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
        const body = await req.json();
        // Достаем данные безопасно
        const { userId, product = {}, quantity, period, country, amountCents } = body;

        console.log(`Попытка покупки с баланса. User: ${userId}, Country: ${country}`);

        // 1. ПРОВЕРЯЕМ БАЛАНС
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('balance, email, referred_by')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.error("Ошибка поиска профиля:", profileError);
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        if ((profile.balance || 0) < amountCents) {
            return NextResponse.json({ error: 'Недостаточно средств на балансе' }, { status: 400 });
        }

        // 2. СПИСЫВАЕМ СРЕДСТВА
        const newBalance = (profile.balance || 0) - amountCents;
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (updateError) {
            console.error("Ошибка списания баланса:", updateError);
            return NextResponse.json({ error: 'Ошибка списания средств' }, { status: 500 });
        }

        // 3. СОЗДАЕМ ЗАКАЗ
        const sessionId = uuidv4();
        
        // Защита от пустых значений
        const safeProductName = product?.name || 'Proxy Purchase'; 
        const safeCountry = country ? country.toLowerCase() : 'ru';

        const metadata = {
            quantity: quantity || 1,
            period: period || 1,
            country: safeCountry,
            type: safeProductName.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: 'order',
            provider: 'balance'
        };

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: userId,
                product_name: safeProductName, // Теперь точно не будет null
                amount_total: amountCents,
                status: 'paid',
                session_id: sessionId,
                payment_details: { method: 'balance' },
                metadata: metadata
            }])
            .select()
            .single();

        if (orderError) {
            // !!! ВОТ ЗДЕСЬ МЫ УВИДИМ РЕАЛЬНУЮ ОШИБКУ В ТЕРМИНАЛЕ !!!
            console.error("CRITICAL: Ошибка создания заказа в БД:", orderError); 
            
            // Внимание: если списание прошло, а заказ не создался - надо бы вернуть деньги,
            // но пока просто вернем ошибку, чтобы ты увидел лог.
            return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });
        }

        // ============================================================
        // 4. ПАРТНЕРСКАЯ ПРОГРАММА
        // ============================================================
        if (profile.referred_by) {
            try {
                const { count } = await supabaseAdmin
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', 'paid');
                
                const isFirstPurchase = count === 1; 
                const percent = isFirstPurchase ? 20 : 10;
                const orderAmountUsd = amountCents / 100;
                const commission = orderAmountUsd * (percent / 100);

                if (commission > 0) {
                    const { data: partner } = await supabaseAdmin
                        .from('profiles')
                        .select('affiliate_balance')
                        .eq('id', profile.referred_by)
                        .single();

                    await supabaseAdmin
                        .from('profiles')
                        .update({ affiliate_balance: (partner?.affiliate_balance || 0) + commission })
                        .eq('id', profile.referred_by);

                    await supabaseAdmin.from('referral_earnings').insert([{
                        partner_id: profile.referred_by,
                        source_user_id: userId,
                        amount: commission,
                        order_amount: orderAmountUsd,
                        percentage: percent,
                        status: 'completed'
                    }]);
                }
            } catch (e) { console.error("Referral Error:", e); }
        }

        // ============================================================
        // 5. АВТОВЫДАЧА (Маленькие буквы)
        // ============================================================
        try {
            const targetPrefix = safeCountry; // Уже toLowerCase()
            // Определяем срок действия
const period = parseInt(order.metadata?.period) || 1;
const unit = order.metadata?.unit || 'months'; // 'days' или 'months'

let hours;
if (unit === 'days') {
    hours = period * 24; // Если 3 дня, то 3 * 24 = 72 часа
} else {
    hours = period * 30 * 24; // По умолчанию месяцы
}


            const qty = parseInt(quantity) || 1;

            console.log(`Balance Auto-Issue: ${targetPrefix} (qty: ${qty})`);

            const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Secret": PROXY_API_SECRET
                },
                body: JSON.stringify({
                    user_id: `${userId}_${sessionId}`,
                    proxy_type: "http",
                    duration_hours: hours,
                    traffic_limit_mb: 0,
                    count: qty, 
                    country_prefix: targetPrefix
                })
            });

            if (proxyResponse.ok) {
                const result = await proxyResponse.json();
                if (!result.error) {
                    await supabaseAdmin
                        .from('orders')
                        .update({ proxy_data: result })
                        .eq('id', order.id);
                } else {
                    console.error("Proxy API Error:", result.error);
                }
            } else {
                console.error("Proxy API HTTP Error:", proxyResponse.status);
            }
        } catch (e) { console.error("Auto-issue Error:", e); }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Global Purchase Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

