// src/lib/telegram.js

const BOT_TOKEN = "8478053685:AAEac2R9pD61LyHGxuK_7Se0y7VmSU2zpTU";
const ADMIN_CHAT_ID = "1672303852";

// 1. Универсальная функция отправки (кому угодно)
export const sendMessage = async (chatId, text) => {
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

// 2. Функция специально для уведомлений админу (обертка)
export const sendAdminNotification = async (text) => {
    await sendMessage(ADMIN_CHAT_ID, text);
};

// Экспортируем ID админа, пригодится для проверки в вебхуке
export const ADMIN_ID = ADMIN_CHAT_ID;

