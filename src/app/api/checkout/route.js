// src/app/api/checkout/route.js (С ПОДДЕРЖКОЙ GUEST CHECKOUT)
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid'; 
import { supabase as clientSupabase } from '../../../lib/supabase.js'; 
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto'; // Для подписи Lava

// Админ-клиент для создания пользователей (Guest Checkout)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const PAYMENT_DOMAIN = 'https://cloud.dv.net'; 
const STORE_UUID = 'c90fa863-b9fb-450f-93e0-736df5ed22c2'; // DV.Net ID

// Настройки Lava (Возьмите их в кабинете Lava)
const LAVA_SHOP_ID = process.env.LAVA_SHOP_ID; 
const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;



export async function POST(req) {
    try {
        const { 
            product = {}, 
                       quantity = 0, 
            period = 0, 
            country = '', 
            amountCents, 
            userId,
            email, // Email для гостя
            type = 'order',
            provider = 'dvnet' // 'dvnet' или 'lava'
        } = await req.json();

        let finalUserId = userId;

        // --- 1. GUEST CHECKOUT (Если нет ID, но есть Email) ---
        if (!finalUserId && email) {
            // Ищем пользователя
            const { data: existingUser } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                // Создаем нового через INVITE (Отправит письмо)
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    // Важно: ссылка редиректа в письме
                    redirectTo: `${req.headers.get('origin')}/profile`
                });

                if (createError) {
                    console.error('Ошибка создания гостя:', createError);
                    return NextResponse.json({ error: 'Ошибка регистрации: ' + createError.message }, { status: 400 });
                }
                finalUserId = newUser.user.id;
            }
        }

        if (!finalUserId) {
            return NextResponse.json({ error: 'Пользователь не авторизован' }, { status: 401 });
        }

        const client_id = uuidv4(); 

        // --- 2. СТРУКТУРА ЗАКАЗА ---
        const metadata = {
            quantity, period, country, provider,
            type: product.name?.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type
        };

        const orderData = {
            user_id: finalUserId,
            product_name: type === 'topup' ? 'Пополнение баланса' : (product.name || 'Unknown Proxy'), 
            amount_total: amountCents,
            status: 'pending',
            session_id: client_id,
            metadata: metadata 
        };



        // Используем Admin для записи в БД (чтобы обойти RLS для новых юзеров)
        const { error: orderError } = await supabaseAdmin.from('orders').insert([orderData]);
        if (orderError) return NextResponse.json({ error: 'Ошибка БД: ' + orderError.message }, { status: 500 });
        
        // 3. ГЕНЕРАЦИЯ ССЫЛКИ
               let paymentUrl = '';
        const amountDollars = (amountCents / 100).toFixed(2);

        if (provider === 'lava') {
            // --- ЛОГИКА LAVA.RU ---
            // Пример генерации подписи (Signature)
            // Вам нужно сверить это с документацией Lava, так как метод может отличаться
            const dataToSign = JSON.stringify({
                sum: amountDollars,
                orderId: client_id,
                shopId: LAVA_SHOP_ID
            });
            
            // const signature = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(dataToSign).digest('hex');
            
            // ТЕСТОВАЯ ССЫЛКА (Пока вы не дали API метод Lava, я ставлю заглушку на их главную)
            // Когда дадите доку - я напишу точный запрос.
            paymentUrl = `https://lava.ru/invoice?shop=${LAVA_SHOP_ID}&sum=${amountDollars}&order=${client_id}`; 
        
        } else {
            // --- ЛОГИКА DV.NET (Старая) ---
            paymentUrl = `${PAYMENT_DOMAIN}/pay/store/${STORE_UUID}/${client_id}?amount=${amountDollars}`;
        }

        return NextResponse.json({ url: paymentUrl });



    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

