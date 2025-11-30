// src/app/api/purchase/route.js
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; 
// Используем правильный путь к клиенту
import { supabase as clientSupabase } from '../../../lib/supabase.js'; 

// ВАЖНО: Для операций с балансом нам нужен Service Role Key (Админские права),
// так как обычный клиент не может менять чужой баланс или обновлять чужие прокси.
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req) {
    try {
        const { userId, product, quantity, period, country, amountCents } = await req.json();

        if (!userId) return NextResponse.json({ error: 'Нет авторизации' }, { status: 401 });

        // 1. ПРОВЕРКА БАЛАНСА
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single();

        if (!profile || profile.balance < amountCents) {
            return NextResponse.json({ error: 'Недостаточно средств на балансе' }, { status: 400 });
        }

        // 2. ПРОВЕРКА НАЛИЧИЯ ТОВАРА (Ищем свободные прокси)
        const type = product.name.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4';
        
        const { data: proxies, error: stockError } = await supabaseAdmin
            .from('proxy_pool')
            .select('id')
            .eq('is_sold', false)
            .eq('country', country)
            .eq('type', type)
            .limit(quantity);

        if (stockError || !proxies || proxies.length < quantity) {
            return NextResponse.json({ error: `Недостаточно прокси (${type}, ${country}) на складе` }, { status: 409 });
        }

        // 3. СПИСАНИЕ СРЕДСТВ
        const newBalance = profile.balance - amountCents;
        const { error: balanceError } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

        if (balanceError) throw new Error('Ошибка списания средств');

        // 4. СОЗДАНИЕ ЗАКАЗА (Уже оплаченного)
        const orderId = uuidv4(); // Внутренний ID для базы, не путать с session_id
        
        const orderData = {
            user_id: userId,
            product_name: product.name,
            amount_total: amountCents,
            status: 'paid', // Сразу оплачено
            session_id: 'balance_payment_' + Date.now(), // Уникальная метка
            metadata: { quantity, country, period, type, payment_method: 'balance' }
        };

        const { data: newOrder, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (orderError) throw new Error('Ошибка создания заказа');

        // 5. ВЫДАЧА ПРОКСИ (Привязываем к заказу и пользователю)
        const proxyIds = proxies.map(p => p.id);
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + period); // Добавляем месяцы

        await supabaseAdmin
            .from('proxy_pool')
            .update({ 
                is_sold: true, 
                owner_id: userId,
                assigned_to_order_id: newOrder.id,
                expires_at: expiryDate.toISOString()
            })
            .in('id', proxyIds);

        return NextResponse.json({ success: true, balance: newBalance });

    } catch (error) {
        console.error('Purchase Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

