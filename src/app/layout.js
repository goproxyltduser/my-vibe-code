// src/app/layout.js
import './globals.css';
import Script from 'next/script';
import ReferralTracker from '@/components/ReferralTracker'; // <--- 1. ИМПОРТ

export const metadata = {
  title: 'Прокси под любые цели',
  description: 'Купить быстрые и анонимные IPv4 и IPv6 прокси. Выдача в одни руки, высокая скорость.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="font-sans bg-background text-text antialiased">
       
        {/* Компонент, который ловит ?ref=ID и сохраняет его */}
        <ReferralTracker /> {/* <--- 2. ВСТАВКА */}

        {/* 1. Инициализация DataLayer */}
        <Script id="datalayer-init" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];`}
        </Script>

        {/* 2. Основной код Яндекс.Метрики */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(105757316, 'init', {
                clickmap:true,
                trackLinks:true,
                accurateTrackBounce:true,
                webvisor:true,
                ecommerce:"dataLayer"
            });
          `}
        </Script>

        {/* 3. NoScript */}
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/105757316"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>

        {children}
      </body>
    </html>
  );
}

