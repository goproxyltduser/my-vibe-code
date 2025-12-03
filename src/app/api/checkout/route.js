// src/app/api/checkout/route.js

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; 
import { supabase as clientSupabase } from '../../../lib/supabase.js'; 

// ⚠️ ВАШИ ДАННЫЕ
const PAYMENT_DOMAIN = 'https://cloud.dv.net'; 
const STORE_UUID = 'c90fa863-b9fb-450f-93e0-736df5ed22c2'; 

export async function POST(req) {
    try {
        const { 
            product = {}, 
            quantity = 0, 
            period = 0, 
            country = '', 
            amountCents, 
            userId,
            type = 'order' 
        } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Пользователь не авторизован' }, { status: 401 });
        }

        const client_id = uuidv4(); 

        // 1. СОБИРАЕМ МЕТАДАННЫЕ (ЭТОГО НЕ ХВАТАЛО!)
        const metadata = {
            quantity,
            period,
            country,
            // Определяем тип по имени товара (IPv6 или IPv4)
            type: product.name?.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type
        };

        // 2. СТРУКТУРА ЗАКАЗА
        const orderData = {
            user_id: userId,
            product_name: type === 'topup' ? 'Пополнение баланса' : (product.name || 'Unknown Proxy'), 
            amount_total: amountCents,
            status: 'pending',
            session_id: client_id, 
            metadata: metadata // <-- ВАЖНО: Записываем детали
        };

        // 3. ВСТАВКА В БД
        const { error: orderError } = await clientSupabase
            .from('orders')
            .insert([orderData]);

        if (orderError) {
            console.error('Ошибка записи в БД:', orderError);
            return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });
        }
        
        // 4. ССЫЛКА
        const amountDollars = (amountCents / 100).toFixed(2);
        const paymentUrl = `${PAYMENT_DOMAIN}/pay/store/${STORE_UUID}/${client_id}?amount=${amountDollars}`;

        return NextResponse.json({ url: paymentUrl });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}

