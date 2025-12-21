// src/lib/telegram.js

// ВСТАВЬ СЮДА СВОИ ДАННЫЕ
const BOT_TOKEN = "8478053685:AAEac2R9pD61LyHGxuK_7Se0y7VmSU2zpTU";
const ADMIN_CHAT_ID = "1672303852"; 

export const sendTelegramMessage = async (text) => {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: text,
                parse_mode: 'HTML' // Чтобы можно было делать жирный текст
            })
        });
    } catch (e) {
        console.error("Telegram Error:", e);
    }
};

