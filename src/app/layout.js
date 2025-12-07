// src/app/layout.js

export const metadata = {
  title: "GOPROXY | Прокси под любые цели", // Текст на вкладке
  description: "Купить быстрые и анонимные IPv4 и IPv6 прокси. Выдача в одни руки, высокая скорость.", // Текст для Google/Yandex
  icons: {
    icon: '/favicon.ico', // Указываем путь к иконке (см. шаг 2)
  },
};

export default function RootLayout({ children }) {
  // ... остальной код (html, body) не трогай
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

