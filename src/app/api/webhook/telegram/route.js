// src/app/api/webhook/telegram/route.js
import { NextResponse } from 'next/server';
import { sendMessage, sendAdminNotification, ADMIN_ID } from '@/lib/telegram';

export async function POST(req) {
    try {
        const update = await req.json();
        
        // Проверяем, есть ли сообщение
        if (!update.message) return NextResponse.json({ ok: true });

        const msg = update.message;
        const chatId = msg.chat.id.toString();
        const text = msg.text || "";

        // === ЛОГИКА АДМИНА (Ты отвечаешь юзеру) ===
        if (chatId === ADMIN_ID) {
            // Проверяем, является ли это ответом (Reply) на чье-то сообщение
            if (msg.reply_to_message) {
                const originalText = msg.reply_to_message.text || "";
                
                // Ищем ID юзера в тексте оригинального сообщения
                // Мы будем специально вставлять "🆔 ID: 12345" в сообщения от юзеров
                const match = originalText.match(/🆔 ID: (\d+)/);

                if (match && match[1]) {
                    const userId = match[1];
                    
                    // Отправляем твой ответ пользователю
                    await sendMessage(userId, `👨‍💻 <b>Поддержка:</b>\n${text}`);
                    
                    // Подтверждаем тебе, что отправлено (необязательно, но удобно)
                    // await sendMessage(ADMIN_ID, "✅ Ответ отправлен.");
                } else {
                    await sendMessage(ADMIN_ID, "⚠️ Не могу найти ID пользователя в сообщении, на которое вы ответили.");
                }
            } else {
                // Если ты просто пишешь боту (не Reply)
                await sendMessage(ADMIN_ID, "Чтобы ответить пользователю, нажми <b>Reply</b> (Ответить) на его сообщение.");
            }
        } 
        
        // === ЛОГИКА ЮЗЕРА (Юзер пишет боту) ===
        else {
            // Формируем сообщение для админа.
            // ВАЖНО: Мы добавляем ID в текст, чтобы потом его выпарсить при ответе.
            const userLink = msg.from.username ? `@${msg.from.username}` : `User`;
            
            const textToAdmin = 
                `📩 <b>Сообщение в бот!</b>\n` +
                `👤 От: ${userLink}\n` +
                `🆔 ID: ${chatId}\n\n` + // <--- ВОТ ЭТО КЛЮЧЕВАЯ СТРОКА ДЛЯ РАБОТЫ ОТВЕТОВ
                `${text}`;

            await sendAdminNotification(textToAdmin);
            
            // Можно отправить авто-ответ юзеру (опционально)
            // await sendMessage(chatId, "Сообщение принято. Оператор скоро ответит.");
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

