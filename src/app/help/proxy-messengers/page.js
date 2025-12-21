import Link from 'next/link';
import Image from 'next/image';

export default function ProxyMessengersGuide() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#1E293B]">
      
      {/* --- ШАПКА СТАТЬИ --- */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-20 text-center">
          <Link href="/" className="inline-block mb-8 text-sm font-bold text-gray-400 hover:text-[#E85D04] transition">
            ← Вернуться на главную
          </Link>
          <h1 className="text-3xl md:text-5xl font-black uppercase mb-6 leading-tight">
            Как настроить прокси для <span className="text-[#0088cc]">Telegram</span> и <span className="text-[#25D366]">WhatsApp</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-xl mx-auto">
            Пошаговая инструкция: обходим блокировки, скрываем IP и защищаем переписку за 2 минуты.
          </p>
        </div>
      </div>

      {/* --- КОНТЕНТ СТАТЬИ --- */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        
        {/* Введение */}
        <div className="prose prose-lg prose-slate max-w-none mb-12">
          <p>
            Использование прокси в мессенджерах позволяет не только обойти региональные ограничения, но и защитить ваш реальный IP-адрес. Это особенно важно для тех, кто ведет сетки каналов, занимается арбитражем трафика или просто ценит приватность.
          </p>
          <div className="bg-orange-50 border-l-4 border-[#E85D04] p-6 rounded-r-xl my-8">
            <h4 className="font-bold text-[#E85D04] mb-2 uppercase text-sm">Важно знать</h4>
            <p className="m-0 text-sm text-gray-700">
              Для мессенджеров идеально подходят <strong>IPv4 прокси</strong>. IPv6 могут работать нестабильно или не поддерживаться вовсе.
            </p>
          </div>
        </div>

        {/* --- ЧАСТЬ 1: TELEGRAM --- */}
        <section className="mb-16">
          <h2 className="flex items-center gap-3 text-3xl font-black uppercase mb-6">
            <div className="w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center text-white text-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </div>
            Настройка в Telegram
          </h2>
          
          <p className="text-gray-600 mb-6 text-lg">
            Telegram имеет встроенную поддержку прокси, поэтому сторонние приложения не нужны. Все настраивается за 30 секунд.
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                    <h3 className="font-bold text-lg mb-1">Откройте настройки</h3>
                    <p className="text-gray-500">Зайдите в <b>Настройки</b> → <b>Данные и память</b>.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                    <h3 className="font-bold text-lg mb-1">Раздел Прокси</h3>
                    <p className="text-gray-500">Прокрутите вниз до раздела <b>Прокси</b> и нажмите <b>Настройки прокси</b>.</p>
                </div>
            </div>
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                    <h3 className="font-bold text-lg mb-1">Добавьте данные</h3>
                    <p className="text-gray-500 mb-4">Нажмите <b>Добавить прокси</b>, выберите тип <b>SOCKS5</b> и введите данные, полученные при покупке:</p>
                    
                    {/* Пример данных */}
                    <div className="bg-gray-900 text-gray-300 p-4 rounded-xl font-mono text-sm">
                        <div className="flex justify-between mb-2">
                            <span>Сервер (IP):</span>
                            <span className="text-white">45.12.34.56</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Порт:</span>
                            <span className="text-white">8000</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Логин (User):</span>
                            <span className="text-white">user123</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Пароль (Pass):</span>
                            <span className="text-white">pass789</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* --- НАТИВНАЯ РЕКЛАМА --- */}
        <div className="my-16 bg-[#E85D04] rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl"></div>
            <h3 className="text-2xl md:text-3xl font-black uppercase mb-4 relative z-10">Нужен быстрый прокси?</h3>
            <p className="text-white/90 mb-8 max-w-lg mx-auto relative z-10">
                GOPROXY выдает чистые IPv4 адреса в одни руки. Идеально подходят для Telegram и WhatsApp.
            </p>
            <Link href="/" className="inline-block px-8 py-4 bg-white text-[#E85D04] font-bold rounded-xl hover:bg-gray-100 transition shadow-lg relative z-10">
                Купить прокси от $1.4
            </Link>
        </div>

        {/* --- ЧАСТЬ 2: WHATSAPP --- */}
        <section className="mb-16">
          <h2 className="flex items-center gap-3 text-3xl font-black uppercase mb-6">
            <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center text-white text-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            Настройка в WhatsApp
          </h2>
          
          <p className="text-gray-600 mb-6 text-lg">
            В WhatsApp тоже есть встроенная функция прокси, но она часто ограничена. Мы рекомендуем использовать специальные приложения-менеджеры, чтобы прокси работал стабильно.
          </p>

          <h3 className="text-xl font-bold mb-4">Способ для Android и iPhone (Рекомендуемый)</h3>
          <p className="text-gray-500 mb-4">
            Лучше всего пропустить весь трафик приложения через специальные утилиты:
          </p>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <li className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="font-bold block text-black mb-1">Для iPhone (iOS)</span>
                Скачайте приложение <span className="text-[#E85D04] font-bold">Shadowrocket</span> (платное, но лучшее) или <span className="text-[#E85D04] font-bold">Potatso</span>.
            </li>
            <li className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="font-bold block text-black mb-1">Для Android</span>
                Скачайте приложение <span className="text-[#E85D04] font-bold">v2rayNG</span> или <span className="text-[#E85D04] font-bold">ProxyDroid</span>.
            </li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-800">
            После установки приложения просто добавьте в него данные вашего прокси (IP, Port, Логин, Пароль) и включите переключатель. WhatsApp заработает автоматически.
          </div>
        </section>

      </article>

      {/* --- ФУТЕР ДЛЯ СТАТЬИ --- */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12 text-center">
        <h4 className="font-bold text-gray-900 mb-4">Остались вопросы?</h4>
        <div className="flex justify-center gap-4">
             <Link href="https://t.me/maxim_hayd" target="_blank" className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:border-gray-400 transition">
                Написать в поддержку
            </Link>
            <Link href="/" className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition">
                Купить прокси
            </Link>
        </div>
      </footer>
    </div>
  );
}

