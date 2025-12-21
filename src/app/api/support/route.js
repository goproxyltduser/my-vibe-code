// src/app/api/support/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

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

        // Шлем в телеграм
        await sendTelegramMessage(
            `📩 <b>Новое обращение!</b>\n` +
            `От: ${email}\n` +
            `Сообщение: ${message}`
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

