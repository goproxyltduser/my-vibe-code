// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'Прокси под любые цели',
  description: 'Купить быстрые и анонимные IPv4 и IPv6 прокси. Выдача в одни руки, высокая скорость.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      {/* Применяем шрифт и фон ко всему телу документа */}
      <body className="font-sans bg-background text-text antialiased">
        {children}
      </body>
    </html>
  );
}

