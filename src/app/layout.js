// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'ProxyVibe Service',
  description: 'Аренда надежных прокси',
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

