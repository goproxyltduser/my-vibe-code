// src/app/api/support/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminNotification } from '@/lib/telegram'; // <--- ОБНОВИЛИ ИМПОРТ

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req) {
    try {
        const { userId, email, message } = await req.json();

        // Сохраняем в базу
        await supabaseAdmin.from('support_tickets').insert([{
            user_id: userId, email, message
        }]);

        // Шлем в телеграм (Форма с сайта)
        await sendAdminNotification(
            `🌐 <b>Заявка с сайта!</b>\n` +
            `📧 Email: ${email}\n` +
            `💬 Сообщение: ${message}\n\n` +
            `<i>Ответьте клиенту на почту.</i>`
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

