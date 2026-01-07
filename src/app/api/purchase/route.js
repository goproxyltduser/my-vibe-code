import { sendAdminNotification } from '@/lib/telegram';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// !!! СЕКРЕТНЫЙ КЛЮЧ PROXY API !!!
const PROXY_API_SECRET = process.env.PROXY_API_SECRET;

// === НАСТРОЙКИ ЦЕН (ОДИНАКОВЫЕ С CHECKOUT) ===
const BASE_PRICE_IPV4 = 2.39;
const BASE_PRICE_IPV6 = 0.29; // 2.90$ за 10 шт
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
        // Мы берем от клиента ТОЛЬКО параметры товара.
        // Цену (amountCents) мы ИГНОРИРУЕМ, чтобы нельзя было прислать отрицательное число.
        const { 
            userId, 
            product = {}, 
            quantity = 1, 
            period = 1, 
            country = 'ru',
            unit = 'months' // 'days' или 'months'
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
            if (!trialPrice) {
                return NextResponse.json({ error: 'Неверный срок тестового периода' }, { status: 400 });
            }
            calculatedUsd = trialPrice;
            productName = `IPv4 Trial (${safePeriod} days)`;
        
        // -- ЛОГИКА ОБЫЧНОЙ ПОКУПКИ --
        } else {
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

        // Переводим доллары в центы (для базы данных и баланса)
        // ВАЖНО: Math.abs защитит от любых глюков, но тут и так всё безопасно
        const amountToDeductCents = Math.round(Math.abs(calculatedUsd) * 100);

        // ============================================================
               // ============================================================
        // 2 & 3. БЕЗОПАСНОЕ СПИСАНИЕ И СОЗДАНИЕ ЗАКАЗА (New Secure Version)
        // ============================================================
        
        // Вызываем нашу защищенную SQL-функцию
        // Она сама проверит баланс и спишет деньги, если их хватает.
        // Это происходит мгновенно, хакер не успеет вклиниться.
        const { data: isSuccess, error: rpcError } = await supabaseAdmin
            .rpc('deduct_balance', { 
                user_id: userId, 
                amount: amountToDeductCents 
            });

        // Если функция вернула ошибку или false (денег нет)
        if (rpcError || !isSuccess) {
            return NextResponse.json({ error: 'Недостаточно средств на балансе' }, { status: 400 });
        }

        // --- ЕСЛИ КОД ДОШЕЛ СЮДА, ДЕНЬГИ УЖЕ СПИСАНЫ ---
        // Теперь создаем запись о заказе, как и раньше.

        const sessionId = uuidv4();
        const safeCountry = country ? country.toLowerCase() : 'ru';

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

        if (orderError) {
            // КРИТИЧЕСКАЯ СИТУАЦИЯ: Деньги списали, а заказ создать не смогли (например, сбой БД).
            // В идеальном мире тут нужно делать возврат (rollback), 
            // но для начала просто залогируем ошибку, чтобы поддержка могла начислить вручную.
            console.error("CRITICAL: Деньги списаны, но заказ не создан!", orderError);
            return NextResponse.json({ error: 'Ошибка создания заказа. Обратитесь в поддержку.' }, { status: 500 });
        }

        // ============================================================
        // ДАЛЕЕ ИДЕТ ПУНКТ 4 (ПАРТНЕРКА) - ЕГО НЕ ТРОГАЕМ
        // ============================================================



        // ============================================================
        // 4. ПАРТНЕРСКАЯ ПРОГРАММА
        // ============================================================
        if (profile.referred_by) {
            try {
                // ... (Логика партнерки осталась прежней, она безопасна)
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
        // 5. АВТОВЫДАЧА (Запрос к поставщику)
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
                    "X-Webhook-Secret": PROXY_API_SECRET
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

         try {
            await sendAdminNotification(
                `⚖️ <b>Списание с баланса!</b>\n` +
                `👤 User ID: ${userId}\n` +
                `📦 Товар: ${productName}\n` +
                `💰 Списано: $${Math.abs(calculatedUsd)}\n` +
                `🆔 Заказ: <code>${sessionId}</code>`
            );
        } catch (e) {}

        return NextResponse.json({ success: true });


    } catch (error) {
        console.error('Purchase Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

