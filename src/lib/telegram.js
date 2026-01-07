// src/lib/telegram.js

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_ID;

// 1. Универсальная функция отправки
export const sendMessage = async (chatId, text) => {
    if (!BOT_TOKEN) return; // Защита если нет токена
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.error("Telegram Send Error:", e);
    }
};

// 2. Уведомление админу
export const sendAdminNotification = async (text) => {
    if (ADMIN_CHAT_ID) {
        await sendMessage(ADMIN_CHAT_ID, text);
    }
};

export const ADMIN_ID = ADMIN_CHAT_ID;

