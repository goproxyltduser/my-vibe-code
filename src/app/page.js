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
                    href="https://t.me/ВАШ_ТЕЛЕГРАМ_АККАУНТ" 
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
const PricingCard = ({ product, currentSession, router, userBalance }) => {
    const isIPv6 = product.name.toLowerCase().includes('ipv6');
    const minQty = product.min_quantity > 0 ? product.min_quantity : 1; 
    const [quantity, setQuantity] = useState(minQty); 
    const [period, setPeriod] = useState(1); 
    const [calculations, setCalculations] = useState({ total: '0.00', discount: 0 });
    const [country, setCountry] = useState('Россия'); 
    const [isProcessing, setIsProcessing] = useState(false); 

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
        
        // Скидка за период
        let periodDiscount = 0;
        if (period === 3) periodDiscount = 0.05;
        if (period === 6) periodDiscount = 0.10;
        
        const finalTotal = (baseCost * discountFactor) * period * (1 - periodDiscount);
        
        setCalculations({
            total: (finalTotal / 100).toFixed(2),
            discount: discount
        });
        
    }, [product.price_per_unit, quantity, period, isIPv6]); 

       const handleBuyClick = async () => {
        if (!currentSession || !currentSession.user || !currentSession.user.id) { 
            alert("Для оформления заказа необходимо войти в Личный кабинет.");
            router.push('/login');
            return;
        }
        setIsProcessing(true); 
        const amountCents = Math.round(parseFloat(calculations.total) * 100);

        // --- ЛОГИКА БАЛАНСА ---
        if (userBalance >= amountCents) {
             const confirmed = window.confirm(`Списать $${calculations.total} с баланса?`);
             if (confirmed) {
                 try {
                    const res = await fetch('/api/purchase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: currentSession.user.id, 
                            product: { name: product.name, id: product.id },
                            quantity, period, country, amountCents,
                        }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Покупка успешна!');
                        window.location.href = '/profile';
                    } else {
                        alert(data.error);
                    }
                 } catch(e) { alert('Ошибка сети'); }
                 setIsProcessing(false);
                 return;
             }
        }
        // ---------------------

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentSession.user.id, 
                    product: { name: product.name, id: product.id },
                    quantity, period, country, amountCents,
                }),
            });
            const data = await response.json();
            if (response.ok) window.location.assign(data.url);
            else alert(`Ошибка: ${data.error}`);
        } catch (error) {
            alert('Ошибка сети.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col border border-gray-200 p-6 rounded-2xl w-full max-w-sm m-4 bg-white hover:border-gray-400 transition-all duration-300 relative shadow-sm hover:shadow-xl">
            {/* БЕЙДЖИК */}
            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold text-white ${isIPv6 ? 'bg-gray-800' : 'bg-primary'}`}>
                {isIPv6 ? 'IPv6' : 'IPv4'}
            </div>

            <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{isIPv6 ? 'Для соц.сетей и парсинга' : 'Универсальные'}</p>
            </div>
            
            <p className="font-medium text-gray-600 mb-6 border-b border-gray-100 pb-4">
                Цена от: <span className="text-lg font-bold text-gray-900">${(product.price_per_unit / 100).toFixed(2)}</span> / шт
            </p>
            
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Страна</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-black focus:ring-0 outline-none text-gray-800 font-medium cursor-pointer">
                        <option value="Россия">🇷🇺 Россия</option>
                        <option value="США">🇺🇸 США</option>
                        <option value="Франция">🇫🇷 Франция</option>
                        <option value="Швейцария">🇨🇭 Швейцария</option>
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
            
            {/* ИНФОБЛОК */}
            <div className="flex justify-between items-center text-xs text-gray-600 mb-6 bg-gray-100 p-3 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center">
                    <span className="text-gray-400 mb-1">Трафик</span>
                    <strong className="text-gray-900 text-lg">∞</strong>
                </div>
                <span className="h-8 w-px bg-gray-300"></span>
                <div className="flex flex-col items-center">
                    <span className="text-gray-400 mb-1">Скорость</span>
                    <strong className="text-gray-900">100 Мб/с</strong>
                </div>
                <span className="h-8 w-px bg-gray-300"></span>
                <div className="flex flex-col items-center">
                    <span className="text-gray-400 mb-1">Мин. заказ</span>
                    <strong className="text-gray-900">{minQty} шт.</strong>
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex justify-between items-end mb-6 pt-6 border-t border-gray-100">
                    <div className="flex flex-col">
                        <span className="text-gray-400 text-xs font-medium uppercase mb-1">Итого к оплате</span>
                        <span className="text-4xl font-extrabold text-gray-900">${calculations.total}</span>
                    </div>
                    {calculations.discount > 0 && <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-100">Скидка -{calculations.discount}%</span>}
                </div>
                
                <button onClick={handleBuyClick} disabled={isProcessing} className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors active:scale-95 duration-200 text-lg shadow-lg">
                    {isProcessing ? 'Обработка...' : 'Купить'}
                </button>
            </div>
        </div>
    );
};

export default function HomePage() {
    const [products, setProducts] = useState([]);
    const [session, setSession] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [openUseCase, setOpenUseCase] = useState(null); 
    const [openFaq, setOpenFaq] = useState(null); 
    const [balance, setBalance] = useState(0); 
    // НОВОЕ СОСТОЯНИЕ ДЛЯ МОБИЛЬНОГО МЕНЮ
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
    const router = useRouter();



    // ОБНОВЛЕННЫЙ useEffect: Загружает сессию И баланс
    useEffect(() => {
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', session.user.id)
                    .single();
                if (profile) setBalance(profile.balance);
            }
        };
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { 
            setSession(session); 
        });
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

       const handlePackageBuy = async (product, qty) => {
        if (!session || !session.user) {
            alert("Для покупки войдите в Личный кабинет");
            router.push('/login');
            return;
        }
        const isIPv6 = product.name.toLowerCase().includes('ipv6');
        let discount = 0;
        if (isIPv6) {
            discount = Math.min(Math.floor(qty / 50) * 5, 40);
        } else {
            discount = Math.min(Math.floor(qty / 5) * 5, 40);
        }
        const discountedPricePerUnit = product.price_per_unit * ((100 - discount) / 100);
        const total = discountedPricePerUnit * qty;
        const amountCents = Math.round(total);

        // --- НОВАЯ ЛОГИКА: ПРОВЕРКА БАЛАНСА ---
        if (balance >= amountCents) {
             const confirmed = window.confirm(`Списать $${(amountCents/100).toFixed(2)} с вашего баланса? (Ваш баланс: $${(balance/100).toFixed(2)})`);
             if (confirmed) {
                 try {
                    const res = await fetch('/api/purchase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            userId: session.user.id, 
                            product: { name: product.name, id: product.id },
                            quantity: qty, period: 1, country: 'Россия', amountCents,
                        }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Покупка успешна! Прокси добавлены в кабинет.');
                        window.location.href = '/profile';
                    } else {
                        alert('Ошибка: ' + data.error);
                    }
                 } catch(e) { alert('Ошибка сети'); }
                 return;
             }
        }
        // ---------------------------------------

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: session.user.id, product: { name: product.name, id: product.id },
                    quantity: qty, period: 1, country: 'Россия', amountCents,
                }),
            });
            const data = await response.json();
            if (response.ok) window.location.assign(data.url);
            else alert(`Ошибка: ${data.error}`);
        } catch (error) {
            alert('Ошибка сети.');
        }
    };



    
    return (
        <main className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B]"> 
            
            {/* 1. HEADER */}
                                  {/* 1. HEADER (АДАПТИВНЫЙ) */}
            <header className="flex flex-wrap md:flex-nowrap justify-between items-center px-6 md:px-12 py-5 bg-[#181818] border-b border-[#333] sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative h-10 w-10 md:h-14 md:w-14">
                             <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
                        </div>
                        <div className="text-2xl md:text-3xl font-extrabold tracking-tighter uppercase text-white group-hover:opacity-80 transition">
                            <span className="text-[#E85D04]">GO</span>PROXY
                        </div>
                    </Link>
                </div>

                {/* КНОПКА БУРГЕР (ВИДНА ТОЛЬКО НА МОБИЛЬНЫХ) */}
                <button 
                    className="md:hidden text-white focus:outline-none"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {/* Иконка меняется (Меню / Крестик) */}
                    {isMobileMenuOpen ? (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
                
                {/* ДЕСКТОПНОЕ МЕНЮ (СКРЫТО НА МОБИЛЬНЫХ) */}
                <nav className="hidden md:flex justify-center flex-1 space-x-8 font-bold text-sm text-gray-300 uppercase tracking-wide">
                    <a href="#tariffs" className="hover:text-[#E85D04] transition-colors">Тарифы</a>
                    <a href="#usecases" className="hover:text-[#E85D04] transition-colors">Применение</a>
                    <a href="#faq" className="hover:text-[#E85D04] transition-colors">FAQ</a>
                    <a href="#contacts" className="hover:text-[#E85D04] transition-colors">Контакты</a>
                </nav>

                {/* ДЕСКТОПНЫЕ КНОПКИ */}
                <div className="hidden md:flex w-auto justify-end gap-4">
                     <a href="https://t.me/ВАШ_ТЕЛЕГРАМ_АККАУНТ" target="_blank" className="px-5 py-2.5 border border-gray-600 text-gray-300 font-bold rounded-lg hover:border-white hover:text-white transition">Опт</a>
                     <Link href={session ? "/profile" : "/login"} className="px-6 py-2.5 bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200] transition shadow-lg">
                        {session ? "Кабинет" : "Войти"}
                    </Link>
                </div>

                {/* МОБИЛЬНОЕ МЕНЮ (ВЫПАДАЮЩЕЕ) */}
                {isMobileMenuOpen && (
                    <div className="w-full md:hidden flex flex-col items-center gap-4 pt-6 pb-4 border-t border-[#333] mt-4 animate-fadeIn">
                        <a href="#tariffs" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">Тарифы</a>
                        <a href="#usecases" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">Применение</a>
                        <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">FAQ</a>
                        <a href="#contacts" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-[#E85D04] font-bold text-lg">Контакты</a>
                        
                        <div className="flex flex-col w-full gap-3 mt-4 px-4">
                            <Link href={session ? "/profile" : "/login"} className="w-full py-3 bg-[#E85D04] text-white font-bold rounded-lg text-center">
                                {session ? "Личный кабинет" : "Войти"}
                            </Link>
                             <a href="https://t.me/ВАШ_ТЕЛЕГРАМ_АККАУНТ" target="_blank" className="w-full py-3 border border-gray-600 text-gray-300 font-bold rounded-lg text-center">
                                Оптовые закупки
                            </a>
                        </div>
                    </div>
                )}
            </header>





            {/* 2. HERO SECTION */}
                                  {/* 2. HERO SECTION */}
            <section className="py-20 px-6 md:px-12 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
                    
                    {/* ЛЕВАЯ КОЛОНКА (ТЕКСТ) */}
                    <div className="w-full md:w-1/2 z-10">
                        <div className="flex flex-col text-left">
                            <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none mb-2">
                                GOPROXY
                            </h1>
                            <h2 className="text-3xl md:text-5xl font-bold text-[#E85D04] uppercase tracking-tight leading-none mb-6">
                                ПРОКСИ ПОД ЛЮБЫЕ ЦЕЛИ
                            </h2>
                            
                            <div className="mt-2 mb-10">
                                <p className="text-xl text-gray-600 font-medium mb-1 leading-tight">
                                    Быстрые. Стабильные. Безопасные.
                                </p>
                                <p className="text-sm text-gray-400 font-medium">HTTP/SOCKS5 • Выдача в одни руки</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start"> 
                            <a href="#tariffs" className="px-8 py-4 bg-[#E85D04] text-white font-bold rounded-xl text-lg shadow-xl shadow-[#E85D04]/30 hover:bg-[#cc5200] transition">Подобрать тариф</a>
                        </div>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА (ИЛЛЮСТРАЦИЯ) */}
                    <div className="w-full md:w-1/2 relative h-[400px] md:h-[600px] flex justify-center items-center">
                        {/* Замените /hero.png на имя вашего файла в папке public */}
                        <Image 
                            src="/hero.png" 
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
                            {products.find(p => !p.name.toLowerCase().includes('ipv6')) && (
                                <PackageWidget 
                                    product={products.find(p => !p.name.toLowerCase().includes('ipv6'))}
                                    quantities={[10, 20, 50, 100]}
                                    handleBuy={handlePackageBuy}
                                />
                            )}

                            {/* IPv6 Packages Widget */}
                            {products.find(p => p.name.toLowerCase().includes('ipv6')) && (
                                <PackageWidget 
                                    product={products.find(p => p.name.toLowerCase().includes('ipv6'))}
                                    quantities={[100, 250, 500, 1000]}
                                    handleBuy={handlePackageBuy}
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
                                               {/* Что такое прокси (ФОН РАСТЯНУТ НА ВЕСЬ ЭКРАН) */}
                        <div className="w-screen relative left-1/2 -translate-x-1/2 bg-white py-16 px-6"> 
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
                        </div>
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
            
            {/* 5. BENEFITS */}
                       <section id="benefits" className="py-24 px-6 bg-[#222222] text-white">


                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-extrabold mb-16 uppercase text-left">Почему выбирают нас</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {BENEFITS.map((item, index) => (
                            <div key={index} className="p-0">
                                <div className="text-5xl font-black text-gray-700 mb-4">0{index + 1}</div>
                                <h4 className="text-2xl font-bold mb-3 text-white">{item.title}</h4>
                                <p className="text-gray-400 leading-relaxed text-lg">{item.text}</p>
                            </div>
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

            {/* 8. FOOTER */}
            <footer id="contacts" className="py-20 px-6 bg-black text-white">
                               <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10">
                    
                    {/* ЛЕВАЯ ГРУППА: GOPROXY + КОНТАКТЫ */}
                    <div className="flex flex-col md:flex-row gap-10 md:gap-32">
                        
                        {/* 1. GOPROXY */}
                        <div className="text-left max-w-xs">
                            <div className="text-3xl font-extrabold mb-6 text-[#E85D04] tracking-tighter">GOPROXY</div>
                            <p className="text-gray-400 mb-6 text-sm leading-relaxed">Proxy под любые цели. Быстрые, стабильные и безопасные IPv4 и IPv6 прокси.</p>
                            <p className="text-gray-600 text-xs">© 2025 GOPROXY LTD. Все права защищены.</p>
                        </div>

                        {/* 2. КОНТАКТЫ (Рядом с GOPROXY, выравнивание слева) */}
                        <div className="text-left">
                            <h4 className="text-sm font-bold mb-8 text-gray-500 uppercase tracking-widest">Контакты</h4>
                            <p className="mb-4 flex items-center gap-3 text-lg font-medium">
                                                               {/* Иконка Почты */}
                                <span className="text-[#E85D04]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                </span> 
                                <a href="mailto:goproxyltd@gmail.com" className="hover:text-white transition text-gray-300">goproxyltd@gmail.com</a>
                            </p>
                            <p className="flex items-center gap-3 text-lg font-medium">
                                {/* Иконка Telegram */}
                                <span className="text-[#E85D04]">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                                    </svg>
                                </span> 
                                <a href="https://t.me/ВАШ_ТЕЛЕГРАМ_АККАУНТ" target="_blank" className="hover:text-white transition text-gray-300">Telegram Support</a>
                            </p>


                        </div>

                    </div>

                    {/* 3. ДОКУМЕНТЫ (Справа, но текст выровнен по левому краю) */}
                    <div className="text-left">
                        <h4 className="text-sm font-bold mb-8 text-gray-500 uppercase tracking-widest">Документы</h4>
                        <ul className="space-y-4 text-sm text-gray-400 font-medium">
                            <li><a href="https://docs.google.com/document/d/14XJKMDQ0ilQv1Y_n5-xBb2yMCeT0qbvqjYwUKtIMvfM/edit?usp=sharing" target="_blank" className="hover:text-[#E85D04] transition">Условия использования</a></li>
                            <li><a href="#" className="hover:text-[#E85D04] transition">Политика конфиденциальности</a></li>
                            <li><a href="#" className="hover:text-[#E85D04] transition">Публичная оферта</a></li>
                        </ul>
                    </div>

                </div>


            </footer>
        </main>
    );
}

