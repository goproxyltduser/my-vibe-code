import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// -- КОНФИГУРАЦИЯ SUPABASE --
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// -- ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ --
// Считываем их здесь, чтобы проверить доступность сразу
const LAVA_SHOP_ID = process.env.LAVA_SHOP_ID;
const LAVA_SECRET_KEY = process.env.LAVA_SECRET_KEY;

const FREEKASSA_SHOP_ID = process.env.FREEKASSA_SHOP_ID;
const FREEKASSA_SECRET_1 = process.env.FREEKASSA_SECRET_1; // Для создания ссылки нужен Секрет 1

const DOMAIN = 'https://goproxy.tech'; // Твой домен

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            product = {},
            quantity = 0,
            period = 0,
            country = '',
            amountCents,
            userId,
            email,
            type = 'order',
            provider = 'dvnet', // 'lava' или 'freekassa'
            referralId
        } = body;

        let finalUserId = userId;
        let finalEmail = email;

        // ============================================================
        // 1. ЛОГИКА АВТОРИЗАЦИИ / РЕГИСТРАЦИИ
        // ============================================================
        if (!finalUserId && email) {
            // Ищем пользователя по email
            const { data: existingUser } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                finalUserId = existingUser.id;
            } else {
                // Если нет - создаем инвайт
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    redirectTo: `${DOMAIN}/profile`
                });
                
                if (createError) {
                    // Иногда юзер есть в Auth, но нет в Profiles, пробуем найти снова
                    const { data: retryUser } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
                    if (retryUser) finalUserId = retryUser.id;
                    else return NextResponse.json({ error: 'Ошибка регистрации: ' + createError.message }, { status: 400 });
                } else {
                    finalUserId = newUser.user.id;
                }
            }
        }

        // Пытаемся достать email, если есть ID
        if (finalUserId && !finalEmail) {
             const { data: u } = await supabaseAdmin.auth.admin.getUserById(finalUserId);
             finalEmail = u?.user?.email;
        }

        if (!finalUserId) {
            return NextResponse.json({ error: 'Не удалось определить пользователя' }, { status: 400 });
        }

        // Привязка реферала
        if (referralId && finalUserId && referralId !== finalUserId) {
            try {
                await supabaseAdmin
                    .from('profiles')
                    .update({ referred_by: referralId })
                    .eq('id', finalUserId)
                    .is('referred_by', null);
            } catch (e) {}
        }

        // ============================================================
        // 2. СОЗДАНИЕ ЗАКАЗА В БД
        // ============================================================
        const client_id = uuidv4();
        
        const metadata = {
            quantity,
            period,
            country: country ? country.toLowerCase() : 'ru',
            type: product.name?.toLowerCase().includes('ipv6') ? 'IPv6' : 'IPv4',
            operation_type: type,
            provider,
            customer_email: finalEmail
        };
        
        const orderData = {
            user_id: finalUserId,
            product_name: type === 'topup' ? 'Пополнение' : (product.name || 'Unknown'),
            amount_total: amountCents,
            status: 'pending',
            session_id: client_id,
            metadata
        };

        const { error: orderError } = await supabaseAdmin.from('orders').insert([orderData]);
        if (orderError) return NextResponse.json({ error: 'Ошибка БД: ' + orderError.message }, { status: 500 });
        
        // ============================================================
        // 3. КОНВЕРТАЦИЯ В РУБЛИ
        // ============================================================
        let paymentUrl = '';
        const amountUsd = (amountCents / 100).toFixed(2);
        
        let exchangeRate = 100; // Резервный курс
        try {
            const rateRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { next: { revalidate: 3600 } });
            if (rateRes.ok) {
                const rateData = await rateRes.json();
                exchangeRate = rateData.Valute.USD.Value;
            }
        } catch (e) { console.error('Ошибка курса ЦБ:', e); }

        const amountRub = (parseFloat(amountUsd) * exchangeRate).toFixed(2);
        const successUrl = `${DOMAIN}/success?amount=${amountUsd}&order_id=${client_id}`;

        // ============================================================
        // 4. ГЕНЕРАЦИЯ ССЫЛКИ НА ОПЛАТУ
        // ============================================================

        if (provider === 'lava') {
            // === LAVA ===
            if (!LAVA_SHOP_ID || !LAVA_SECRET_KEY) {
                console.error('LAVA ERROR: Keys missing in .env');
                return NextResponse.json({ error: 'Server Config Error (Lava)' }, { status: 500 });
            }

            const payload = {
                sum: parseFloat(amountRub),
                orderId: client_id,
                shopId: LAVA_SHOP_ID,
                successUrl: successUrl,
                failUrl: `${DOMAIN}/profile`,
                hookUrl: `${DOMAIN}/api/webhook/lava`
            };

            const signature = crypto.createHmac('sha256', LAVA_SECRET_KEY).update(JSON.stringify(payload)).digest('hex');

            const lavaResponse = await fetch('https://api.lava.ru/business/invoice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Signature': signature },
                body: JSON.stringify(payload)
            });

            const lavaResult = await lavaResponse.json();
            if (lavaResult.data?.url) {
                paymentUrl = lavaResult.data.url;
            } else {
                return NextResponse.json({ error: 'Lava Error: ' + JSON.stringify(lavaResult) }, { status: 400 });
            }

        } else if (provider === 'freekassa') {
            // === FREEKASSA (Method: Form URL) ===
            
            // Проверка наличия ключей
            if (!FREEKASSA_SHOP_ID || !FREEKASSA_SECRET_1) {
                console.error('FK FATAL: Config missing. ShopID:', FREEKASSA_SHOP_ID, 'Secret exists:', !!FREEKASSA_SECRET_1);
                return NextResponse.json({ error: 'Server Config Error (FreeKassa)' }, { status: 500 });
            }

            const currency = 'RUB';
            // Формула: md5(merchant_id:amount:secret1:currency:order_id)
            const signSource = `${FREEKASSA_SHOP_ID}:${amountRub}:${FREEKASSA_SECRET_1}:${currency}:${client_id}`;
            
            // !!! БЛОК ДИАГНОСТИКИ (Удалишь его, когда всё заработает) !!!
            console.log('============= ДИАГНОСТИКА FREEKASSA =============');
            console.log('1. Shop ID (из env):', FREEKASSA_SHOP_ID);
            console.log('2. Amount (RUB):', amountRub);
            console.log('3. Secret 1 (из env):', FREEKASSA_SECRET_1 ? (FREEKASSA_SECRET_1.substring(0, 3) + '***') : 'UNDEFINED (!!!)');
            console.log('4. Order ID:', client_id);
            console.log('5. Строка для подписи:', signSource);
            console.log('=================================================');
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

            const signature = crypto.createHash('md5').update(signSource).digest('hex');

            // Формируем ссылку
            paymentUrl = `https://pay.freekassa.ru/?m=${FREEKASSA_SHOP_ID}&oa=${amountRub}&o=${client_id}&s=${signature}&currency=${currency}&em=${finalEmail}`;
        }

        return NextResponse.json({ url: paymentUrl });

    } catch (error) {
        console.error('Checkout API Error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

