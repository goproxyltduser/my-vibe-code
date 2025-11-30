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
            type = 'order' // 'order' или 'topup'
        } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Пользователь не авторизован' }, { status: 401 });
        }

        const client_id = uuidv4(); 

        // Собираем метаданные (детали заказа)
        const metadata = {
            quantity: quantity,
            country: country,
            period: period,
            type: product.name?.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type // запоминаем: это покупка или пополнение
        };

        const orderData = {
            user_id: userId,
            product_name: type === 'topup' ? 'Пополнение баланса' : (product.name || 'Unknown Proxy'), 
            amount_total: amountCents,
            status: 'pending',
            session_id: client_id,
            metadata: metadata // <-- СОХРАНЯЕМ ДЕТАЛИ
        };

        // ВСТАВКА В БД
        const { error: orderError } = await clientSupabase
            .from('orders')
            .insert([orderData]);

        if (orderError) {
            console.error('Ошибка записи в БД:', orderError);
            return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });
        }
        
        // Ссылка на оплату
        const paymentUrl = `${PAYMENT_DOMAIN}/pay/store/${STORE_UUID}/${client_id}?amount=${amountCents}`;

        return NextResponse.json({ url: paymentUrl });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}

