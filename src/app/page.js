// src/app/page.js - ФИНАЛЬНАЯ СБОРКА (BLACK/ORANGE STYLE)
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- КОНСТАНТЫ (ТЕКСТЫ) ---
const USE_CASES = [
    { title: "Анализ эффективности рекламы", text: "Помогает маркетологам отслеживать эффективность рекламных кампаний, анализировать показатели. Сбор данных: С использованием прокси можно анонимно и безопасно собирать данные о поведении пользователей." },
    { title: "SEO (Search Engine Optimization)", text: "Автоматизация анализа конкурентов: проверка позиций, анализ ключевых слов. Избегание блокировок поисковых систем. Сбор данных для улучшения позиций сайта." },
    { title: "Арбитраж трафика", text: "Прокси позволяет арбитражникам оптимизировать рекламные кампании, избегая блокировок и ограничений со стороны рекламных платформ." },
    { title: "IT", text: "— Тестирование и разработка сервисов из разных регионов.— Защита и анонимизация трафика разработчиков и серверов.— Обход лимитов API и стабильная работа автоматизаций." },
    { title: "Недоступный контент", text: "Доступ к недоступному контенту: Обходите региональные блокировки и свободно посещайте сайты, сервисы и платформы, закрытые в вашей стране." },
    { title: "Социальные сети", text: "Безопасная работа с аккаунтами: Управляйте несколькими аккаунтами, ведите рекламу и аналитику без блокировок и ограничений по IP." },
    { title: "Игры", text: "Играйте без задержек и ограничений: Прокси помогают снизить пинг, получить доступ к серверам из других регионов, обходить игровые блокировки." },
];

const BENEFITS = [
    { title: "Стабильность и скорость", text: "99.6% подключений, бесперебойная работа и скорость до 100 мб/сек." },
    { title: "Сервис", text: "Мы стремимся к тому, чтобы наш сервис оставил лучшие впечатления, а вы вернулись к нам снова." },
    { title: "Поддержка", text: "Бесперебойная поддержка 24/7 без выходных и праздников." },
    { title: "Чистые айпи", text: "Вам точно не нужно беспокоиться о блокировках." },
    { title: "Низкие цены", text: "Выгода до 40% при оптовой покупке." },
    { title: "Постоянство", text: "93% клиентов продлевают повторно, потому что довольны." },
];

const REVIEWS = [
    { user: "elferno", text: "Постоянно сталкивался с проблемой стабильности. Этот сервис первый, где месяц работаю без перебоев. Рекомендую." },
    { user: "Kirill", text: "Всё работает. Без танцев с бубном. Рад, что наконец нашёл нормальный сервис." },
    { user: "BelovD", text: "Мои старые прокси лагали. Здесь - тишина, стабильность." },
    { user: "Артур", text: "Проверил 20+ IP — все чистые. Для парсинга и работы с рекламой топ." },
    { user: "Lena", text: "Ведём 100 рекламных аккаунтов. Эти прокси держат нагрузку спокойно. Поддержка отвечает мгновенно." },
    { user: "cryptoK.O.D", text: "Месяц искал решение для тикток акков. С вашими прокси 3 недели без единого ограничения." },
];

const FAQ_ITEMS = [
    { q: "Чем отличаются ваши прокси от всех остальных?", a: "Мы гарантируем стабильность и безопасность наших IP. Не просто слова, а статистика и довольные клиенты." },
    { q: "Сколько занимает выдача прокси после оплаты?", a: "Моментально после подтверждения оплаты заказа. В редких случаях, когда требуется уточнение деталей или отсутствие прокси в базе, может занять немного больше времени." },
    { q: "Что делать, если прокси после выдачи оказался не рабочий?", a: "Обратиться в службу поддержки." },
    { q: "Как оформить возврат?", a: "Написать в поддержку в течение 48 часов с момента оплаты." },
    { q: "Как продлить?", a: "Мы предупреждаем за несколько дней до окончания оплаченного периода. Вы сможете оплатить продление в личном кабинете." },
    { q: "Если я заказал на неделю/месяц. Прокси будут активны весь период?", a: "Мы гарантируем работоспособность прокси на весь оплаченный период, за исключением случаев получения бана в связи с вашими действиями." },
    { q: "Я получил бан IP не по своей вине. Что делать?", a: "Обратиться в службу поддержки. Если вы действительно не совершали действий, в которых есть риск бана, мы заменим IP на оставшийся срок." },
    { q: "Кто нибудь пользовался купленными прокси до меня?", a: "Такой гарантии не даем ни мы, ни хостинг провайдер. Мы даем гарантию лишь на то, что покупая IP у нас он будет работать, и будет выдан только вам в руки." },
    { q: "Пакетные прокси тоже персональные?", a: "Да, если выбор самих прокси персональные." },
    { q: "Я живу в ограниченной зоне, подходят ли ваши прокси для таких зон?", a: "Да, наши IP можно использовать в ограниченных зонах. Если у вас возникнут трудности с доступом к определённым сайтам, обратитесь в нашу службу поддержки за помощью." },
    { q: "Могут ли ваши прокси выдерживать высокие нагрузки?", a: "Для нас важен комфорт: скорость и стабильность от параллельных соединений практически не теряется. У нас был клиентский опыт, где запускали около 100 параллельных соединений и все работало. Однако, в некоторых странах есть ограничение трафика до 50 гб/сутки, из-за дорогого трафика." },
    { q: "У вас есть бесплатный пробный период?", a: "К сожалению, это невозможно. Ни один сервис не сможет предоставить вам такую услугу. Дело в безопасности. Однако, наш сервис предлагает возврат в течение 48 часов если вы будете недовольны работой нашего сервиса." },
    { q: "Какой сайт лучше всего использовать для проверки региона прокси?", a: "На основе исследований выбрали лучшего кандидата: IP2Location." },
    { q: "В чем разница между статическими и динамическими прокси?", a: "Статические прокси сохраняют один постоянный IP-адрес для стабильного и долгосрочного использования, а динамичные прокси автоматически меняют IP через некоторое время." },
    { q: "Какие прокси лучше для соц.сетей?", a: "Мы рекомендуем использовать прокси той страны, на которую зарегистрированы аккаунты." },
    { q: "Сколько нужно прокси для соц.сетей?", a: "1 IP на 1 аккаунт. Таким образом вы снизите риск блокировки ваших аккаунтов." },
    { q: "Как можно использовать прокси в играх?", a: "Многие геймеры используют прокси для дополнительных аккаунтов или ферм для ускоренной прокачки аккаунта или статистики, а также в качестве заработка на фермах." },
    { q: "Есть ли ограничения по трафику?", a: "Наш сервис гарантирует скорость прокси до 100 мб/сек, за исключением ненормативного использования прокси (если наш сервис определит, что IP нарушает безопасность, скорость временно может быть снижена)." },
];



// === КОМПОНЕНТЫ ===

const AccordionItem = ({ title, text, isOpen, onClick }) => (
    <div className="border-b border-gray-200 last:border-0">
        <button 
            onClick={onClick}
            className="flex justify-between items-center w-full p-5 text-left font-semibold transition-colors hover:bg-gray-50"
        >
            <span className="text-gray-900 text-lg">{title}</span>
            <span className={`transform transition-transform duration-200 text-primary ${isOpen ? 'rotate-180' : ''}`}>
                <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
        </button>
        <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="p-5 pt-0 text-gray-600 leading-relaxed">
                {text}
            </div>
        </div>
    </div>
);

// === НОВОЕ МОДАЛЬНОЕ ОКНО (POPUP) ===
// === МОДАЛЬНОЕ ОКНО С ВЫБОРОМ ПЛАТЕЖКИ (ОБНОВЛЕННОЕ) ===
const PaymentModal = ({ isOpen, onClose, data, userBalance, onPayBalance, onPayGateway, isProcessing }) => {
    if (!isOpen || !data) return null;
    const canPay = userBalance >= data.amountCents;
    const price = (data.amountCents / 100).toFixed(2);
    const bal = (userBalance / 100).toFixed(2);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">✕</button>
                <div className="bg-gray-50 p-6 text-center border-b">
                    <h3 className="text-xl font-black text-gray-900">ОПЛАТА</h3>
                    <p className="text-sm text-gray-500">{data.productName}</p>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex justify-between font-bold text-lg"><span>К оплате:</span><span className="text-[#E85D04]">${price}</span></div>
                    <div className={`p-2 rounded text-sm text-center border ${canPay ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>Баланс: ${bal}</div>
                    
                    {canPay && <button onClick={onPayBalance} disabled={isProcessing} className="w-full py-3 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#cc5200]">{isProcessing ? '...' : 'Списать с баланса'}</button>}
                    
                    <div className="text-center text-xs text-gray-400 uppercase my-2">- ИЛИ -</div>
                    
                    {/* КНОПКИ ПЛАТЕЖЕК */}
                    <button onClick={() => onPayGateway('dvnet')} disabled={isProcessing} className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 flex justify-between px-4"><span>DV.Net</span><span className="opacity-50 text-xs font-normal">Карты / Крипта</span></button>
                    <button onClick={() => onPayGateway('lava')} disabled={isProcessing} className="w-full py-3 bg-[#702cf9] text-white font-bold rounded-xl hover:bg-[#5b23cc] flex justify-between px-4"><span>Lava.ru</span><span className="opacity-50 text-xs font-normal">RUB / Qiwi</span></button>
                </div>
            </div>
        </div>
    );
};






// === ВИДЖЕТ ГОТОВЫХ ПАКЕТОВ (ТЕМНЫЙ СТИЛЬ) ===
const PackageWidget = ({ product, quantities, handleBuy }) => {
    const isIPv6 = product.name.toLowerCase().includes('ipv6');
    
    const getPriceData = (qty) => {
        let discount = 0;
        if (isIPv6) {
            discount = Math.min(Math.floor(qty / 50) * 5, 40);
        } else {
            discount = Math.min(Math.floor(qty / 5) * 5, 40);
        }
        const discountedPricePerUnit = product.price_per_unit * ((100 - discount) / 100);
        const total = discountedPricePerUnit * qty;
        return {
            total: (total / 100).toFixed(2),
            perUnit: (discountedPricePerUnit / 100).toFixed(2)
        };
    };

    return (
        <div className="bg-[#181818] text-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col h-auto border border-[#333]">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
                {isIPv6 ? 'IPv6 Пакеты' : 'IPv4 Пакеты'}
            </h3>
            
            <div className="flex justify-between text-gray-400 text-xs uppercase font-bold mb-2 px-2">
                <span>Количество</span>
                <span>Цена</span>
            </div>

            <div className="space-y-2 mb-6">
                {quantities.map(qty => {
                    const price = getPriceData(qty);
                    return (
                        <div key={qty} className="flex justify-between items-center bg-[#222] p-3 rounded-xl border border-[#333] hover:border-gray-500 transition group">
                            <div className="flex flex-col">
                                <span className="font-bold text-lg text-white">{qty} <span className="text-xs text-gray-500 font-normal">шт.</span></span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="font-bold text-lg">${price.total}</div>
                                    <div className="text-[10px] text-gray-500">${price.perUnit} / шт</div>
                                </div>
                                <button 
                                    onClick={() => handleBuy(product, qty)} 
                                    className="bg-white text-black text-xs font-bold px-3 py-2 rounded hover:bg-gray-200 transition"
                                >
                                    Купить
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-700">
                <div className="mb-3">
                    <div className="text-gray-400 text-sm">Оптовое предложение:</div>
                    <div className="font-bold text-lg text-white">Больше 2000 IP</div>
                </div>
                <a 
                    href="https://t.me/maxim_hayd" 
                    target="_blank"
                    className="flex items-center justify-between w-full p-3 border border-[#E85D04] text-[#E85D04] rounded-xl font-bold hover:bg-[#E85D04] hover:text-white transition text-sm"
                >
                    <span>Связаться с нами</span>
                    <span>→</span>
                </a>
            </div>
        </div>
    );
};

// === КАРТОЧКА ТАРИФА (КАЛЬКУЛЯТОР - ПОЛНЫЙ ФУНКЦИОНАЛ) ===
// === КАРТОЧКА ТАРИФА (КАЛЬКУЛЯТОР) - ОБНОВЛЕННАЯ ===
// === КАРТОЧКА ТАРИФА (КАЛЬКУЛЯТОР) - ЛОГИКА РЕДИРЕКТА НА CHECKOUT ===
const PricingCard = ({ product, currentSession, router, userBalance }) => {
    const isIPv6 = product.name.toLowerCase().includes('ipv6');
    const minQty = product.min_quantity > 0 ? product.min_quantity : 1;
    const [quantity, setQuantity] = useState(minQty);
    const [period, setPeriod] = useState(1);
    const [calculations, setCalculations] = useState({ total: '0.00', saved: '0.00', discount: 0 });
    const [country, setCountry] = useState('ru');
    
    // Нам больше не нужны состояния isProcessing и showPaymentChoice для редиректа

    useEffect(() => {
        let discount = 0;
        if (isIPv6) {
            const rawDiscount = Math.floor(quantity / 50) * 5;
            discount = Math.min(rawDiscount, 40);
        } else {
            const rawDiscount = Math.floor(quantity / 5) * 5;
            discount = Math.min(rawDiscount, 40);
        }
        const baseCost = product.price_per_unit * quantity;
        const discountFactor = (100 - discount) / 100;
        const finalTotal = (baseCost * discountFactor) * period * (1 - (period === 3 ? 0.05 : period === 6 ? 0.1 : 0));
       
        // Считаем полную цену без скидок для отображения выгоды
        const fullPrice = baseCost * period;
        const saved = fullPrice - finalTotal;
       
        setCalculations({
            total: (finalTotal / 100).toFixed(2),
            saved: (saved / 100).toFixed(2),
            discount: discount
        });

    }, [product.price_per_unit, quantity, period, isIPv6]);


    // ЛОГИКА: РЕДИРЕКТ НА CHECKOUT (БЕЗ РЕГИСТРАЦИИ)
       const handleBuyClick = () => {
        const price = parseFloat(calculations.total);
        
        // 1. ОТПРАВЛЯЕМ В МЕТРИКУ (Добавление в корзину)
        if (typeof window !== 'undefined' && window.dataLayer) {
            window.dataLayer.push({
                "ecommerce": {
                    "add": {
                        "products": [{
                            "id": product.id,
                            "name": product.name,
                            "price": price,
                            "quantity": quantity
                        }]
                    }
                }
            });
            console.log("Метрика: add event sent");
        }

        // 2. ПЕРЕХОДИМ НА CHECKOUT
        // Передаем параметры в URL
        const params = new URLSearchParams({
            product: product.name,
            price: price.toString(),
            quantity: quantity.toString(),
            period: period.toString(),
            country: country
        });

        router.push(`/checkout?${params.toString()}`);
    };




    return (
        <div className="flex flex-col border border-gray-200 p-8 rounded-2xl w-full max-w-sm m-4 bg-white hover:border-[#E85D04] transition-all duration-300 relative shadow-lg">
            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold text-white ${isIPv6 ? 'bg-gray-800' : 'bg-[#E85D04]'}`}>
                {isIPv6 ? 'IPv6' : 'IPv4'}
            </div>

            <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{isIPv6 ? 'Для соц.сетей и парсинга' : 'Универсальные'}</p>
            </div>
           
            <div className="space-y-5 mb-8">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Страна</label>
                                       <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-black focus:ring-0 outline-none text-gray-800 font-medium cursor-pointer">
                        <option value="ru">🇷🇺 Россия</option>
                        <option value="kz">🇰🇿 Казахстан</option>
                        <option value="us">🇺🇸 США</option>
                        <option value="fr">🇫🇷 Франция</option>
                        <option value="ch">🇨🇭 Швейцария</option>
                    </select>


                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Количество (Мин. {minQty})</label>
                    <input type="number" min={minQty} value={quantity} onChange={(e) => setQuantity(Math.max(minQty, Number(e.target.value)))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-black focus:ring-0 outline-none text-gray-800 font-medium" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Срок аренды</label>
                    <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-black focus:ring-0 outline-none text-gray-800 font-medium cursor-pointer">
                        <option value={1}>1 месяц</option>
                        <option value={3}>3 месяца (-5%)</option>
                        <option value={6}>6 месяцев (-10%)</option>
                    </select>
                </div>
            </div>
           
            <div className="flex justify-between items-center text-xs text-gray-600 mb-6 bg-gray-100 p-3 rounded-lg border border-gray-200">
                <span>Трафик: <strong>∞</strong></span>
                <span>Скорость: <strong>100 Мб/с</strong></span>
            </div>

            {/* ИНФОРМАЦИЯ О СКИДКЕ */}
            <div className="mb-6 -mt-4 text-center">
                <p className="text-sm font-bold text-[#E85D04]">
                    Скидка от {isIPv6 ? '50' : '5'} прокси. До 50% за объем и срок
                </p>
            </div>

            <div className="mt-auto relative">
                {/* 1. БЛОК ЦЕНЫ И СКИДКИ */}
                <div className="flex flex-col gap-1 mb-6 pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-400 text-xs font-bold uppercase mb-1">Итого к оплате</span>
                        <span className="text-3xl font-extrabold text-gray-900">${calculations.total}</span>
                    </div>

                    {/* Сумма скидки */}
                    {parseFloat(calculations.saved) > 0 && (
                        <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-gray-400 text-xs font-bold uppercase mb-1">СУММА СКИДКИ:</span>
                            <span className="text-gray-500 font-extrabold text-sm">
                                -${calculations.saved} <span className="text-green-400 font-medium">(-{calculations.discount}%)</span>
                            </span>
                        </div>
                    )}
                </div>
               
                {/* 2. КНОПКА КУПИТЬ (ПЕРЕХОД НА CHECKOUT) */}
                <button onClick={handleBuyClick} className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors active:scale-95 duration-200 text-lg shadow-lg">
                    Купить
                </button>
            </div>
        </div>
    );
};





export default function HomePage() {
                  // НОВЫЕ СОСТОЯНИЯ
    const [modalData, setModalData] = useState(null);
    const [isModalProcessing, setIsModalProcessing] = useState(false);

    // ОТКРЫТИЕ ОКНА (Вместо редиректа)
    const openModal = (product, qty, amountCents) => {
        // Если нет сессии, переходим на чекаут для гостя (Guest Checkout)
        if (!session?.user) {
             const params = new URLSearchParams({
                id: product.id, name: product.name, price: amountCents,
                qty, period: 1, country: 'Россия'
            });
            router.push(`/checkout?${params.toString()}`);
            return;
        }
        // Если вошел - открываем модалку
        setModalData({ product, qty, amountCents, productName: product.name });
    };

    // ОПЛАТА ИЗ ОКНА
    const handleModalPayment = async (method) => {
        setIsModalProcessing(true);
        const isBalance = method === 'balance';
        const endpoint = isBalance ? '/api/purchase' : '/api/checkout';
        const provider = isBalance ? null : method; // 'dvnet' или 'lava'

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    product: { name: modalData.product.name, id: modalData.product.id },
                    quantity: modalData.qty, period: 1, country: 'Россия', 
                    amountCents: modalData.amountCents,
                    provider: provider // Передаем провайдера
                })
            });
            const data = await res.json();
            if (isBalance && data.success) {
                window.location.href = '/profile';
            } else if (data.url) {
                window.location.assign(data.url);
            } else {
                alert(data.error);
            }
        } catch (e) { alert('Ошибка'); }
        finally { setIsModalProcessing(false); setModalData(null); }
    };





    const [products, setProducts] = useState([]);
    const [session, setSession] = useState(null); 
    const [loading, setLoading] = useState(false);
       // --- СОСТОЯНИЯ ДЛЯ МОДАЛЬНОГО ОКНА ОПЛАТЫ ---
    const PaymentModal = ({ isOpen, onClose, data, userBalance, onPayBalance, onPayGateway, isProcessing }) => {
    if (!isOpen || !data) return null;
    const canPay = userBalance >= data.amountCents;
    const price = (data.amountCents / 100).toFixed(2);
    const bal = (userBalance / 100).toFixed(2);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">✕</button>
                <div className="bg-gray-50 p-6 text-center border-b">
                    <h3 className="text-xl font-black text-gray-900">ОПЛАТА</h3>
                    <p className="text-sm text-gray-500">{data.productName}</p>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex justify-between font-bold text-lg"><span>К оплате:</span><span className="text-[#E85D04]">${price}</span></div>
                    <div className={`p-2 rounded text-sm text-center border ${canPay ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>Баланс: ${bal}</div>
                    
                    {canPay && <button onClick={onPayBalance} disabled={isProcessing} className="w-full py-3 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#cc5200]">{isProcessing ? '...' : 'Списать с баланса'}</button>}
                    
                    <div className="text-center text-xs text-gray-400 uppercase my-2">- ИЛИ -</div>
                    
                    {/* КНОПКИ ПЛАТЕЖЕК */}
                    <button onClick={() => onPayGateway('dvnet')} disabled={isProcessing} className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 flex justify-between px-4"><span>DV.Net</span><span className="opacity-50 text-xs font-normal">Карты / Крипта</span></button>
                    <button onClick={() => onPayGateway('lava')} disabled={isProcessing} className="w-full py-3 bg-[#702cf9] text-white font-bold rounded-xl hover:bg-[#5b23cc] flex justify-between px-4"><span>Lava.ru</span><span className="opacity-50 text-xs font-normal">RUB / Qiwi</span></button>
                </div>
            </div>
        </div>
    );
};




    const [openUseCase, setOpenUseCase] = useState(null); 
    const [openFaq, setOpenFaq] = useState(null); 
      const [balance, setBalance] = useState(0); // Баланс пользователя
    

    // НОВОЕ СОСТОЯНИЕ ДЛЯ МОБИЛЬНОГО МЕНЮ
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
    const router = useRouter();



    // ОБНОВЛЕННЫЙ useEffect: Загружает сессию И баланс
     useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            // Если пользователь есть, грузим баланс
            if (session?.user) {
                const { data: p } = await supabase.from('profiles').select('balance').eq('id', session.user.id).single();
                if (p) setBalance(p.balance);
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { setSession(session); });
        return () => subscription.unsubscribe();
    }, []);




    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('products').select('*').order('min_quantity', { ascending: true });
            if (error) console.error(error); else setProducts(data);
            setLoading(false);
        };
        fetchProducts();
    }, []);
   // 1. ОТКРЫТИЕ МОДАЛКИ (Вызывается при клике на "Купить" в пакете)
    // 1. ОТКРЫТИЕ МОДАЛКИ (Вызывается при клике на "Купить" в пакете)
    const openPackageModal = (product, qty, amountCents) => {
        // ИСПРАВЛЕНО: Если нет сессии, отправляем на Checkout как гостя
        if (!session?.user) {
            const params = new URLSearchParams({
                id: product.id,
                name: product.name,
                price: amountCents,
                qty: qty,
                period: 1, // Пакеты всегда по умолчанию на 1 месяц
                country: 'Россия' // Дефолтная страна для пакетов
            });
            router.push(`/checkout?${params.toString()}`);
            return;
        }

        // Если авторизован — открываем модалку оплаты балансом/шлюзом
        setModalData({
            product,
            qty,
            amountCents,
            productName: product.name
        });
    };


    


             // ЛОГИКА ПОКУПКИ ПАКЕТА (РЕДИРЕКТ НА CHECKOUT)
       const handlePackageBuy = (pkg, qty) => {
        // Расчет цены
        let discount = 0;
        if (qty >= 50) discount = 15;
        else if (qty >= 20) discount = 10;
        else if (qty >= 10) discount = 5;

        const pricePerUnit = pkg.price_per_unit * ((100 - discount) / 100);
        const totalPrice = (pricePerUnit * qty) / 100; // Цена в долларах

        // 1. МЕТРИКА
        if (typeof window !== 'undefined' && window.dataLayer) {
            window.dataLayer.push({
                "ecommerce": {
                    "add": {
                        "products": [{
                            "id": pkg.id,
                            "name": pkg.name,
                            "price": totalPrice,
                            "quantity": qty
                        }]
                    }
                }
            });
        }

        // 2. РЕДИРЕКТ НА CHECKOUT
        const params = new URLSearchParams({
            product: pkg.name,
            price: totalPrice.toFixed(2),
            quantity: qty.toString(),
            period: "30", // Пакеты обычно на 30 дней
            country: "mixed" // Или конкретная страна
        });

        router.push(`/checkout?${params.toString()}`);
    };










    
    return (
        <main className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B]"> 
            
            {/* 1. HEADER (АДАПТИВНЫЙ + ИНСТРУКЦИЯ) */}
<header className="flex flex-wrap md:flex-nowrap justify-between items-center px-4 md:px-8 py-4 bg-[#181818] border-b border-[#333] sticky top-0 z-50">
    
    {/* ЛОГОТИП */}
    <div className="flex items-center gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-9 w-9 md:h-12 md:w-12">
                 <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
            </div>
            <div className="text-xl md:text-2xl font-extrabold tracking-tighter uppercase text-white group-hover:opacity-80 transition">
                <span className="text-[#E85D04]">GO</span>PROXY
            </div>
        </Link>
    </div>

    {/* КНОПКА БУРГЕР (МОБИЛЬНАЯ) */}
    <button
        className="md:hidden text-white focus:outline-none p-2"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    >
        {isMobileMenuOpen ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
    </button>
   
    {/* ДЕСКТОПНОЕ МЕНЮ (Центр) */}
    {/* Используем gap вместо space-x для лучшего контроля, уменьшили шрифт до text-xs */}
    <nav className="hidden md:flex items-center justify-center flex-1 gap-4 lg:gap-6 font-bold text-xs text-gray-300 uppercase tracking-wide mx-4">
        <a href="#tariffs" className="hover:text-[#E85D04] transition-colors whitespace-nowrap">Тарифы</a>
        <a href="#usecases" className="hover:text-[#E85D04] transition-colors whitespace-nowrap">Применение</a>
        <a href="#faq" className="hover:text-[#E85D04] transition-colors whitespace-nowrap">FAQ</a>
        
        <a href="#partners-block" className="hover:text-[#E85D04] transition-colors text-[#E85D04] whitespace-nowrap">
            Партнерам
        </a>

        {/* --- НОВАЯ КНОПКА-ИНСТРУКЦИЯ --- */}
        <Link 
            href="/help/proxy-messengers" 
            className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-gray-600 rounded-full transition-all group cursor-pointer"
        >
            <span className="normal-case text-[10px] lg:text-xs text-gray-400 group-hover:text-white font-medium whitespace-nowrap">
                Настройка для
            </span>
            <div className="flex items-center gap-1">
                {/* Иконка Telegram */}
                <svg className="w-4 h-4 text-[#2AABEE]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                {/* Иконка WhatsApp */}
                <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
        </Link>
        {/* --------------------------------- */}

        <a href="#contacts" className="hover:text-[#E85D04] transition-colors whitespace-nowrap">Контакты</a>
    </nav>

    {/* ДЕСКТОПНЫЕ КНОПКИ (Право) */}
    <div className="hidden md:flex w-auto justify-end gap-3 shrink-0">
            <a href="https://t.me/maxim_hayd" target="_blank" className="px-4 py-2 text-xs lg:text-sm border border-gray-600 text-gray-300 font-bold rounded-lg hover:border-white hover:text-white transition whitespace-nowrap">Опт</a>
            <Link href={session ? "/profile" : "/login"} className="px-5 py-2 text-xs lg:text-sm bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200] transition shadow-lg whitespace-nowrap">
            {session ? "Кабинет" : "Войти"}
        </Link>
    </div>

    {/* МОБИЛЬНОЕ МЕНЮ (ВЫПАДАЮЩЕЕ) */}
    {isMobileMenuOpen && (
        <div className="w-full md:hidden flex flex-col items-center gap-5 pt-8 pb-8 border-t border-[#333] mt-4 animate-fadeIn absolute top-full left-0 bg-[#181818] shadow-2xl h-screen overflow-y-auto">
            <a href="#tariffs" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">Тарифы</a>
            <a href="#usecases" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">Применение</a>
            
            {/* ССЫЛКА НА ИНСТРУКЦИЮ В МОБИЛЬНОМ МЕНЮ */}
            <Link 
                href="/help/proxy-messengers" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-3 bg-[#222] rounded-xl border border-[#333]"
            >
                <div className="flex gap-2">
                    <svg className="w-6 h-6 text-[#2AABEE]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <span className="text-white font-medium">Как настроить</span>
            </Link>

            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">FAQ</a>
            
            <a href="#partners-block" onClick={() => setIsMobileMenuOpen(false)} className="text-[#E85D04] hover:text-white font-bold text-lg">
                Партнерам
            </a>
            
            <a href="#contacts" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">Контакты</a>

            <div className="flex flex-col w-full gap-3 mt-4 px-4">
                <Link href={session ? "/profile" : "/login"} className="w-full py-3 bg-[#E85D04] text-white font-bold rounded-lg text-center">
                    {session ? "Личный кабинет" : "Войти"}
                </Link>
                 <a href="https://t.me/maxim_hayd" target="_blank" className="w-full py-3 border border-gray-600 text-gray-300 font-bold rounded-lg text-center">
                    Опт
                </a>
            </div>
        </div>
    )}
</header>







            {/* 2. HERO SECTION */}
                                  {/* 2. HERO SECTION */}
                                                                                                              <section className="pt-20 pb-20 px-6 md:px-12 md:pt-10 bg-white overflow-hidden">
                {/* Убрал 'text-center' из родительского div, теперь везде text-left */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 text-left">



     
                                                                     {/* ЛЕВАЯ КОЛОНКА (ТЕКСТ) */}
                    <div className="w-full md:w-1/2 z-10">
                        <div className="flex flex-col text-left">
                            {/* Заголовок: меньше на мобильном (4xl), большой на ПК (8xl) */}
                                                                                     {/* ЗАГОЛОВОК: Крупнее, жирнее, два цвета */}
                                                       {/* 1. ЗАГОЛОВОК (GOPROXY УБРАН) */}
                            {/* На мобильном 4xl, на ПК 6xl. Оранжевый только у "ЛЮБЫЕ ЦЕЛИ" */}
                            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none mb-6 text-gray-900">
                                ПРОКСИ ПОД <br className="md:hidden" /> <span className="text-[#E85D04]">ЛЮБЫЕ ЦЕЛИ</span>
                            </h1>

                            {/* 2. ГАРАНТИЯ (Жирный, черный, заглавные) */}
                            <p className="text-sm md:text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">
                                ГАРАНТИЯ ВОЗВРАТА 48Ч. ВЫДАЧА В ОДНИ РУКИ.
                            </p>
                            
                            {/* 3. ПОДЗАГОЛОВОК (Меньше заголовка: text-lg на моб, text-2xl на ПК) */}
                            <div className="mb-8 md:mb-10">
                                <p className="text-base md:text-2xl text-gray-600 font-medium mb-1 leading-tight">
    Быстрые. Стабильные. Безопасные.
</p>


                                <p className="text-xs md:text-sm text-gray-400 font-medium">HTTP/SOCKS5</p>
                            </div>




                        </div>

                        {/* Кнопка остается как была */}
                        <div className="flex flex-col md:flex-row gap-4 justify-start"> 
                            <a href="#tariffs" className="px-8 py-4 bg-[#E85D04] text-white font-bold rounded-xl text-lg shadow-xl shadow-[#E85D04]/30 hover:bg-[#cc5200] transition text-center">Подобрать тариф</a>
                        </div>
                    </div>



                    {/* ПРАВАЯ КОЛОНКА (ИЛЛЮСТРАЦИЯ) */}
                                       <div className="hidden md:flex w-full md:w-1/2 relative h-[400px] md:h-[600px] justify-center items-center">
                        {/* Замените /hero.png на имя вашего файла в папке public */}
                        <Image 
                            src="/hero_new.png" 
                            alt="Proxy Illustration" 
                            fill 
                            className="object-contain"
                            priority
                        />
                    </div>



                </div>
            </section>





            {/* 3. TARIFFS & PACKAGES */}
            <section id="tariffs" className="pt-20 pb-0 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    
                    {/* КАЛЬКУЛЯТОРЫ ТАРИФОВ */}
                    <div className="flex justify-center flex-wrap gap-12 mb-24 items-start">
                        {loading ? <div className="py-10 text-gray-400">Загрузка тарифов...</div> : products.map(product => (
                            <PricingCard                                   key={product.id} 
                                product={product} 
                                currentSession={session} 
                                userBalance={balance} // <--- ДОБАВЛЕНА ЭТА СТРОКА
                                router={router}
                            />


                        ))}
                    </div>

                    {/* ГОТОВЫЕ ПАКЕТЫ (ТЕМНЫЕ ВИДЖЕТЫ) */}
                    <div className="max-w-5xl mx-auto">
                        <h3 className="text-3xl font-extrabold text-center mb-12 uppercase text-gray-900">Готовые предложения</h3>
                        
                        <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
                            {/* IPv4 Packages Widget */}
                                                       {/* IPv4 */}
                            {products.find(p => !p.name.toLowerCase().includes('ipv6')) && (
                                <PackageWidget 
                                    product={products.find(p => !p.name.toLowerCase().includes('ipv6'))}
                                    quantities={[10, 20, 50, 100]}
                                    // ИЗМЕНЕНО: Вызываем открытие модалки с расчетом цены
                                    handleBuy={(prod, qty) => {
                                        // Расчет цены (упрощенный, тот же что и в виджете)
                                        const discount = Math.min(Math.floor(qty / 5) * 5, 40);
                                        const price = prod.price_per_unit * ((100 - discount) / 100) * qty;
                                        openPackageModal(prod, qty, Math.round(price));
                                    }}
                                />
                            )}

                            {/* IPv6 */}
                            {products.find(p => p.name.toLowerCase().includes('ipv6')) && (
                                <PackageWidget 
                                    product={products.find(p => p.name.toLowerCase().includes('ipv6'))}
                                    quantities={[100, 250, 500, 1000]}
                                    // ИЗМЕНЕНО:
                                    handleBuy={(prod, qty) => {
                                        const discount = Math.min(Math.floor(qty / 50) * 5, 40);
                                        const price = prod.price_per_unit * ((100 - discount) / 100) * qty;
                                        openPackageModal(prod, qty, Math.round(price));
                                    }}
                                />
                            )}


                        </div>
                    </div>

                    {/* ГАРАНТИЯ И ЧТО ТАКОЕ ПРОКСИ */}
                    <div className="mt-28">
                        <div className="text-center mb-16">
                            <h3 className="text-4xl font-black text-gray-900 mb-4">ГАРАНТИЯ ВОЗВРАТА 48 ЧАСОВ</h3>
                            <p className="text-gray-500 mb-8 text-lg max-w-2xl mx-auto">Если прокси вам не подойдут по любой причине, мы вернем деньги без лишних вопросов и бюрократии.</p>
                            <a href="#contacts" className="inline-block px-10 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-primary transition shadow-lg">
                                Обратиться в поддержку
                            </a>
                        </div>
                                               
                    </div>
                </div>
            </section>

                       {/* === НОВЫЙ БЛОК: ПРЕИМУЩЕСТВА (ТЕМНЫЙ) === */}
            <section id="benefits" className="py-24 px-6 bg-[#222222] text-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-extrabold mb-16 uppercase text-center">Почему выбирают нас</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {BENEFITS.map((item, index) => (
                            <div key={index} className="flex flex-col items-start transition duration-300">
                                <div className="mb-6 text-[#E85D04]">
                                    {[
                                        <svg key="0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
                                        <svg key="1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
                                        <svg key="2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.413 1.605-1.02.52-2.502.52-3.522 0-.582-.298-.782-1.05-.413-1.605a1.107 1.107 0 00-.57-1.664l-.143-.048a2.25 2.25 0 01-1.161-.886l-.51-.766a1.125 1.125 0 01.216-1.49l1.068-.89a1.125 1.125 0 00.405-.864v-.568m0 0a9.752 9.752 0 013 0m0 0a9.752 9.752 0 01-3 0m3 0h.008v.008h-.008V3.03zm0 0a9.75 9.75 0 010 17.94m-8.91-2.906A9.75 9.75 0 0112 15c4.316 0 8.01 2.656 9.47 6.488.163.428.611.64 1.05.503.447-.14.67-.621.503-1.05a11.25 11.25 0 00-20.04 0c-.167.429.056.91.503 1.05.439.137.887-.075 1.05-.503z" /></svg>,
                                        <svg key="3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.746 3.746 0 0121 12z" /></svg>,
                                        <svg key="4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>,
                                        <svg key="5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                                    ][index]}
                                </div>
                                <h4 className="text-2xl font-bold mb-3 text-white">{item.title}</h4>
                                <p className="text-gray-400 leading-relaxed text-lg">{item.text}</p>
                            </div>
                        ))}
                    </div>
                                                  {/* КНОПКА "КУПИТЬ" ПОД ПРЕИМУЩЕСТВАМИ */}
                    <div className="mt-12 text-center md:text-left">
                        <a href="#tariffs" className="inline-block px-12 py-4 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#cc5200] transition shadow-lg shadow-[#E85D04]/20">
                            Купить
                        </a>
                    </div>


                </div>
            </section>

                       {/* === НОВЫЙ БЛОК: ЛИЧНЫЙ КАБИНЕТ === */}
            <section className="py-24 px-6 bg-white overflow-hidden border-b border-gray-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    
                    {/* ТЕКСТОВАЯ ЧАСТЬ (Слева) */}
                    <div className="w-full md:w-1/2">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tight leading-none mb-6">
                            ВАШ УДОБНЫЙ <br/>
                            <span className="text-[#E85D04]">ЛИЧНЫЙ КАБИНЕТ</span>
                        </h2>
                        <p className="text-xl text-gray-500 mb-10 leading-relaxed font-medium">
                            Мы убрали всё лишнее, чтобы вы управляли своими прокси в два клика.
                        </p>

                        <ul className="space-y-8">
                            <li className="flex gap-5">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-[#E85D04]/10 flex items-center justify-center mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#E85D04]"></div>
                                </div>
                                <div>
                                    <strong className="block text-gray-900 text-xl mb-2">Всё как на ладони</strong>
                                    <p className="text-gray-600 leading-relaxed text-lg">Баланс, история операций и статус заказов — на одной странице.</p>
                                </div>
                            </li>
                            <li className="flex gap-5">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-[#E85D04]/10 flex items-center justify-center mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#E85D04]"></div>
                                </div>
                                <div>
                                    <strong className="block text-gray-900 text-xl mb-2">Мгновенный доступ</strong>
                                    <p className="text-gray-600 leading-relaxed text-lg">Получайте данные (IP, Login, Pass) сразу после оплаты.</p>
                                </div>
                            </li>
                            <li className="flex gap-5">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-[#E85D04]/10 flex items-center justify-center mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#E85D04]"></div>
                                </div>
                                <div>
                                    <strong className="block text-gray-900 text-xl mb-2">Автоматизация</strong>
                                    <p className="text-gray-600 leading-relaxed text-lg">С балансом вам не придется постоянно бегать по платежкам при покупке и при продлении: за вас это сделает баланс.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* ИЗОБРАЖЕНИЕ (Справа) */}
                    <div className="w-full md:w-1/2 relative">
                        {/* Тень и скругление для красоты */}
                        <div className="rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-gray-50 transform hover:scale-[1.02] transition duration-500">
                            <Image 
                                src="/dashboard_new.png" 
                                alt="Личный кабинет GOPROXY" 
                                width={800} 
                                height={600} 
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    </div>

                </div>
            </section>



            {/* === НОВЫЙ БЛОК: ЧТО ТАКОЕ ПРОКСИ (БЕЛЫЙ) === */}
            <section className="bg-white py-24 px-6"> 
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-3xl md:text-4xl font-black mb-6 text-gray-900 uppercase tracking-wide">
                        ЧТО ТАКОЕ <span className="text-[#E85D04]">ПРОКСИ?</span>
                    </h3>
                    <div className="text-gray-700 space-y-4 text-lg leading-relaxed max-w-3xl mx-auto text-left font-bold">
                        <p>
                            Proxy — это посредник между пользователем и интернет-ресурсом. Прокси выполняет функцию передачи запросов, скрывая реальный IP-адрес, обеспечивая анонимность и безопасность.
                        </p>
                        <p>
                            Они широко используются для обхода географических ограничений, увеличения скорости доступа, фильтрации трафика и парсинга.
                        </p>
                    </div>
                </div>
            </section>

            {/* 4. USE CASES */}
            <section id="usecases" className="py-24 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-extrabold mb-4 uppercase text-center text-gray-900">Сферы применения <span className="text-primary">Прокси</span></h2>
                    <p className="text-center text-gray-500 mb-12 text-lg">В отличие от VPN, proxy чаще используют в маркетинге и в работе с трафиком.</p>
                    
                    <div className="space-y-0">
                        {USE_CASES.map((item, index) => (
                            <AccordionItem 
                                key={index} 
                                title={item.title} 
                                text={item.text} 
                                isOpen={openUseCase === index} 
                                onClick={() => setOpenUseCase(openUseCase === index ? null : index)}
                            />
                        ))}
                    </div>
                </div>
            </section>
            
           



            {/* 6. REVIEWS */}
                         <section className="py-24 px-6 bg-[#222222] overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    {/* Заголовок белый (text-white), фон секции темный (#222222) */}
                    <h2 className="text-4xl font-extrabold mb-12 uppercase text-center text-white">Отзывы клиентов</h2>
                                       {/* Скроллбар в серых тонах */}
                    <div className="flex overflow-x-auto pb-8 gap-6 snap-x [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#333333] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#555555] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#777777]">


                        {REVIEWS.map((review, index) => (
                            <div key={index} className="snap-center shrink-0 w-96 p-8 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition">

         <div className="flex items-center mb-6">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center font-bold text-gray-900 mr-4 border border-gray-200 text-xl shadow-sm">
                                        {review.user[0].toUpperCase()}
                                    </div>
                                    <span className="font-bold text-gray-900 text-lg">{review.user}</span>
                                </div>
                                <p className="text-gray-600 italic leading-relaxed">"{review.text}"</p>
                            </div>
                        ))}
                    </div>
                                                  {/* КНОПКА "КУПИТЬ" ПОД ПРЕИМУЩЕСТВАМИ */}
                    <div className="mt-12 text-center md:text-left">
                        <a href="#tariffs" className="inline-block px-12 py-4 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#cc5200] transition shadow-lg shadow-[#E85D04]/20">
                            Купить
                        </a>
                    </div>


                </div>
            </section>

            {/* 7. FAQ */}
            <section id="faq" className="py-24 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-extrabold mb-12 uppercase text-left text-gray-900">Частые вопросы</h2>
                                       {/* Фон блока изменен на белый */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">


                        {FAQ_ITEMS.map((item, index) => (
                            <AccordionItem 
                                key={index} 
                                title={item.q} 
                                text={item.a} 
                                isOpen={openFaq === index} 
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                            />
                        ))}
                    </div>
                </div>
            </section>
                      {/* 7.5. ПАРТНЕРСКАЯ ПРОГРАММА (ОБНОВЛЕННЫЙ БЛОК) */}
<section id="partners-block" className="py-20 px-6 bg-[#E85D04] overflow-hidden relative scroll-mt-24">
  
  {/* Декоративный фон */}
  <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
  <div className="absolute bottom-0 right-0 w-96 h-96 bg-black opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none"></div>

  <div className="max-w-6xl mx-auto relative z-10 text-white">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      
      {/* ЛЕВАЯ КОЛОНКА: ТЕКСТ */}
      <div className="text-center lg:text-left order-2 lg:order-1 flex flex-col items-center lg:items-start">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2 leading-none">
          Партнерская программа
        </h2>
        <p className="text-xl md:text-2xl font-medium opacity-90 mb-10 text-orange-100 uppercase tracking-wide">
          создай пассивный доход
        </p>

        {/* Пункты списка */}
        <ul className="space-y-6 mb-10 text-lg md:text-xl font-medium text-left w-full max-w-lg">
          <li className="flex items-start gap-4">
            <div className="mt-1 min-w-[28px] w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0">
               <svg className="w-5 h-5 text-[#E85D04]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span className="leading-snug">
              Зарабатывай <span className="font-bold border-b-2 border-white/40">20%</span> с первой продажи и <span className="font-bold border-b-2 border-white/40">10%</span> пожизненно
            </span>
          </li>
          
          <li className="flex items-start gap-4">
             <div className="mt-1 min-w-[28px] w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0">
               <svg className="w-5 h-5 text-[#E85D04]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span className="leading-snug">Прозрачные показатели и удобный личный кабинет</span>
          </li>

          <li className="flex items-start gap-4">
             <div className="mt-1 min-w-[28px] w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0">
               <svg className="w-5 h-5 text-[#E85D04]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span className="leading-snug">Индивидуальные условия для крупных партнеров</span>
          </li>
        </ul>

        {/* Кнопка */}
        <Link 
            href="/partners" 
            className="inline-block px-10 py-5 bg-white text-[#E85D04] font-black rounded-2xl text-lg hover:bg-gray-100 hover:-translate-y-1 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
        >
            Стать партнером
        </Link>
      </div>

      {/* ПРАВАЯ КОЛОНКА: ИЛЛЮСТРАЦИЯ */}
      <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end">
         <div className="relative w-full max-w-md lg:max-w-full">
            <Image 
              src="/images/partners-illustration.png" 
              alt="Иллюстрация партнерской программы"
              width={700}
              height={700}
              className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-in-out"
              priority={false}
            />
         </div>
      </div>

    </div>
  </div>
</section>






            {/* 8. FOOTER */}
            <footer id="contacts" className="py-20 px-6 bg-black text-white">
                               <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10">
                    
                    {/* ЛЕВАЯ ГРУППА: GOPROXY + КОНТАКТЫ */}
                    <div className="flex flex-col md:flex-row gap-10 md:gap-32">
                        
                        {/* 1. GOPROXY */}
                        <div className="text-left max-w-xs">
                            <div className="text-3xl font-extrabold mb-6 text-[#E85D04] tracking-tighter">GOPROXY</div>
                            <p className="text-gray-400 mb-6 text-sm leading-relaxed">Proxy под любые цели. Быстрые, стабильные и безопасные IPv4 и IPv6 прокси.</p>
                            <p className="text-gray-600 text-xs">© 2025 INTERNET COMMUNICATION SERVICE LTD. Все права защищены.</p>
                                                          {/* ЛОГОТИП ПЛАТЕЖКИ */}
                            <div className="mt-6">
                                <Image 
                                    src="/lava.png" 
                                    alt="Lava Payment" 
                                    width={120} 
                                    height={40} 
                                    className="object-contain opacity-80 hover:opacity-100 transition"
                                />
                            </div>


                        </div>

                                               {/* 2. КОНТАКТЫ */}
                        <div className="text-left">
                            <h4 className="text-sm font-bold mb-8 text-gray-500 uppercase tracking-widest">Контакты</h4>
                            
                            {/* 1. Email */}
                            <p className="mb-4 flex items-center gap-3 text-lg font-medium">
                                <span className="text-[#E85D04]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                </span> 
                                <a href="mailto:goproxyltd@gmail.com" className="hover:text-white transition text-gray-300">goproxyltd@gmail.com</a>
                            </p>

                            {/* 2. Telegram Support */}
                            <p className="mb-4 flex items-center gap-3 text-lg font-medium">
                                <span className="text-[#E85D04]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                                    </svg>
                                </span> 
                                <a href="https://t.me/maxim_hayd" target="_blank" className="hover:text-white transition text-gray-300">Telegram Support</a>
                            </p>

                            {/* 3. Telegram Channel (НОВЫЙ) */}
                            <p className="mb-4 flex items-center gap-3 text-lg font-medium">
                                <span className="text-[#E85D04]">
                                    {/* Иконка громкоговорителя (News/Channel) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73" />
                                    </svg>
                                </span> 
                                <a href="https://t.me/goproxy_tech" target="_blank" className="hover:text-white transition text-gray-300">Наш Telegram канал</a>
                            </p>

                            {/* 4. Телефон */}
                            <p className="flex items-center gap-3 text-lg font-medium">
                                <span className="text-[#E85D04]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5V4.5z" clipRule="evenodd" />
                                    </svg>
                                </span> 
                                <a href="tel:+97441186686" className="hover:text-white transition text-gray-300">+974 4 1186686</a>
                            </p>
                        </div>






                    </div>

                    {/* 3. ДОКУМЕНТЫ (Справа, но текст выровнен по левому краю) */}
                                       {/* 3. ДОКУМЕНТЫ (Справа, но текст выровнен по левому краю) */}
                    <div className="text-left">
                        <h4 className="text-sm font-bold mb-8 text-gray-500 uppercase tracking-widest">Документы</h4>
                        <ul className="space-y-4 text-sm text-gray-400 font-medium">
                            {/* Ссылка на /terms */}
                            <li>
                                <Link href="/terms" className="hover:text-[#E85D04] transition">
                                    Условия использования
                                </Link>
                            </li>
                            {/* Ссылка на /privacy */}
                            <li>
                                <Link href="/privacy" className="hover:text-[#E85D04] transition">
                                    Политика конфиденциальности
                                </Link>
                            </li>
                            {/* Ссылка на /offer */}
                            <li>
                                <Link href="/offer" className="hover:text-[#E85D04] transition">
                                    Публичная оферта
                                </Link>
                            </li>
                            <li>
                                <Link href="/refund" className="hover:text-[#E85D04] transition">
                                    Политика возврата
                                </Link>
                            </li>
                        </ul>
                    </div>



                </div>


            </footer>

             {/* МОДАЛКА ОПЛАТЫ */}
                       <PaymentModal 
                isOpen={!!modalData} 
                onClose={() => setModalData(null)} 
                data={modalData} 
                userBalance={balance} 
                onPayBalance={() => handleModalPayment('balance')} 
                onPayGateway={(provider) => handleModalPayment(provider)} 
                isProcessing={isModalProcessing}
            />



        </main>
    );
}

