import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { sendAdminNotification } from '@/lib/telegram';

// === НАСТРОЙКИ ЦЕН ===
const BASE_PRICE_IPV4 = 2.39;
const BASE_PRICE_IPV6 = 0.29; 
const TRIAL_PRICES = {
    '3': 0.49,
    '5': 0.79
};

export async function POST(req) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        const body = await req.json();
        const { 
            userId, 
            product = {}, 
            quantity = 1, 
            period = 1, 
            country = 'ru',
            unit = 'months' 
        } = body;

        console.log(`Покупка с баланса. User: ${userId}, Product: ${product.name}`);

        // ============================================================
        // 1. БЕЗОПАСНЫЙ РАСЧЕТ ЦЕНЫ (SERVER-SIDE)
        // ============================================================
        let calculatedUsd = 0;
        let productName = '';
        
        const safeQty = Math.max(1, parseInt(quantity) || 1);
        const safePeriod = Math.max(1, parseInt(period) || 1);
        const productNameLower = product.name ? product.name.toLowerCase() : '';

        // -- ЛОГИКА ТЕСТОВОГО ПЕРИОДА --
        if (unit === 'days' || productNameLower.includes('trial')) {
            const trialPrice = TRIAL_PRICES[safePeriod.toString()];
            if (!trialPrice) return NextResponse.json({ error: 'Неверный срок' }, { status: 400 });
            calculatedUsd = trialPrice;
            productName = `IPv4 Trial (${safePeriod} days)`;
        } else {
            // -- ЛОГИКА ОБЫЧНОЙ ПОКУПКИ --
            const isIPv6 = productNameLower.includes('ipv6');
            let basePricePerUnit = isIPv6 ? BASE_PRICE_IPV6 : BASE_PRICE_IPV4;
            
            // Скидка за объем
            let discountPercent = 0;
            if (isIPv6) {
                const rawDiscount = Math.floor(safeQty / 50) * 5;
                discountPercent = Math.min(rawDiscount, 40);
            } else {
                const rawDiscount = Math.floor(safeQty / 5) * 5;
                discountPercent = Math.min(rawDiscount, 40);
            }

            const baseCost = basePricePerUnit * safeQty;
            const costWithVolumeDiscount = baseCost * ((100 - discountPercent) / 100);

            // Скидка за период
            let periodDiscount = 0;
            if (safePeriod === 3) periodDiscount = 0.05;
            if (safePeriod === 6) periodDiscount = 0.10;

            calculatedUsd = costWithVolumeDiscount * safePeriod * (1 - periodDiscount);
            calculatedUsd = Math.round(calculatedUsd * 100) / 100;
            productName = product.name || (isIPv6 ? 'IPv6 Proxy' : 'IPv4 Proxy');
        }

        const amountToDeductCents = Math.round(Math.abs(calculatedUsd) * 100);

        // ============================================================
        // 2. ПРОВЕРКА БАЛАНСА ПОЛЬЗОВАТЕЛЯ
        // ============================================================
        
        // ВОТ ЗДЕСЬ МЫ ИСПРАВИЛИ ОШИБКУ "profile is not defined"
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('balance, email, referred_by')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        if ((profile.balance || 0) < amountToDeductCents) {
            return NextResponse.json({ error: 'Недостаточно средств на балансе' }, { status: 400 });
        }

        // ============================================================
        // 3. СПИСАНИЕ СРЕДСТВ
        // ============================================================
        const newBalance = (profile.balance || 0) - amountToDeductCents;
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (updateError) return NextResponse.json({ error: 'Ошибка списания' }, { status: 500 });

        const sessionId = uuidv4();
        const safeCountry = country ? country.toLowerCase() : 'ru';

        // Создаем запись заказа
        const metadata = {
            quantity: safeQty,
            period: safePeriod,
            country: safeCountry,
            type: productNameLower.includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: 'order',
            provider: 'balance',
            unit: unit
        };

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: userId,
                product_name: productName,
                amount_total: amountToDeductCents,
                status: 'paid',
                session_id: sessionId,
                payment_details: { method: 'balance' },
                metadata: metadata
            }])
            .select()
            .single();

        if (orderError) return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });

        // ============================================================
        // 4. ТЕЛЕГРАМ УВЕДОМЛЕНИЕ
        // ============================================================
        try {
            await sendAdminNotification(
                `⚖️ <b>Списание с баланса!</b>\n` +
                `👤 User ID: ${userId}\n` +
                `📦 Товар: ${productName}\n` +
                `💰 Списано: $${calculatedUsd}\n` +
                `🆔 Заказ: <code>${sessionId}</code>`
            );
        } catch (e) { console.error('TG Error:', e); }

        // ============================================================
        // 5. ПАРТНЕРСКАЯ ПРОГРАММА
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
                const orderAmountUsd = amountToDeductCents / 100;
                const commission = orderAmountUsd * (percent / 100);

                if (commission > 0) {
                     const { data: partner } = await supabaseAdmin.from('profiles').select('affiliate_balance').eq('id', profile.referred_by).single();
                     await supabaseAdmin.from('profiles').update({ affiliate_balance: (partner?.affiliate_balance || 0) + commission }).eq('id', profile.referred_by);
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
        // 6. АВТОВЫДАЧА (Используем ключ из ENV)
        // ============================================================
        try {
            let hours;
            if (unit === 'days') {
                hours = safePeriod * 24; 
            } else {
                hours = safePeriod * 30 * 24; 
            }

            console.log(`Balance Issue: ${safeCountry} (${safeQty} шт, ${hours} ч)`);

            const proxyResponse = await fetch("https://api.goproxy.tech/api/webhook/create-proxy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // !!! БЕРЕМ КЛЮЧ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ !!!
                    "X-Webhook-Secret": process.env.PROXY_API_SECRET 
                },
                body: JSON.stringify({
                    user_id: `${userId}_${sessionId}`,
                    proxy_type: "http",
                    duration_hours: hours,
                    traffic_limit_mb: 0,
                    count: safeQty,
                    country_prefix: safeCountry
                })
            });

            if (proxyResponse.ok) {
                const result = await proxyResponse.json();
                if (!result.error) {
                    await supabaseAdmin.from('orders').update({ proxy_data: result }).eq('id', order.id);
                }
            }
        } catch (e) { console.error("Auto-issue Error:", e); }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Purchase Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

