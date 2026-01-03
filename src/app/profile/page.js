"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase.js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
   
    const [orders, setOrders] = useState([]);      // История операций
    const [myProxies, setMyProxies] = useState([]); // Купленные прокси (ТОВАР)
   
    const [balance, setBalance] = useState(0);
    const [topupAmount, setTopupAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const router = useRouter();
    
    // СОСТОЯНИЯ ДЛЯ ПАРОЛЯ
    const [newPassword, setNewPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // 1. Загружаем БАЛАНС
            const { data: profile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', user.id)
                .single();
            if (profile) setBalance(profile.balance || 0);

            // 2. Загружаем ИСТОРИЮ ЗАКАЗОВ
            const { data: userOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // 3. Собираем ПРОКСИ
            if (userOrders) {
                setOrders(userOrders);

                let allProxies = [];
                userOrders.forEach(order => {
                    if (order.status === 'paid' && order.proxy_data) {
                        const raw = order.proxy_data;
                        
                        // Вспомогательная функция для добавления
                        const addProxy = (p) => {
                            allProxies.push({
                                id: p.id || order.id,
                                ip: p.proxy_host || p.ip || '0.0.0.0',
                                port: p.proxy_port || p.port,
                                login: p.username || p.login,
                                password: p.password,
                                type: p.proxy_type || 'http', // http/socks5
                                country: order.metadata?.country?.toUpperCase() || 'RU',
                                created_at: order.created_at,
                                expires_at: p.expires_at || null // Если есть дата истечения
                            });
                        };

                        if (Array.isArray(raw)) {
                            raw.forEach(addProxy);
                        } else if (raw.proxy_host || raw.ip) {
                            addProxy(raw);
                        }
                    }
                });
                setMyProxies(allProxies);
            }

            setLoading(false);
        };
        getUserData();
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const handleTopUp = async () => {
        if (!topupAmount || Number(topupAmount) <= 0) {
            alert("Введите корректную сумму.");
            return;
        }
        setIsProcessing(true);
        try {
            const amountCents = Math.round(parseFloat(topupAmount) * 100);
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, amountCents, type: 'topup' }),
            });
            const data = await response.json();

            if (response.ok) {
                if (typeof window !== 'undefined' && window.dataLayer) {
                    window.dataLayer.push({
                        "ecommerce": { "add": { "products": [{ "id": "balance_topup", "name": "Пополнение баланса", "price": parseFloat(topupAmount), "quantity": 1 }] } }
                    });
                }
                window.location.assign(data.url);
            } else {
                alert(`Ошибка: ${data.error}`);
            }
        } catch (error) {
            alert('Ошибка сети.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 6) {
            alert("Пароль должен быть не менее 6 символов");
            return;
        }
        setIsPasswordLoading(true);
        setPasswordStatus('Обновление...');
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            alert("Ошибка: " + error.message);
            setPasswordStatus('');
        } else {
            alert("Пароль успешно установлен!");
            setPasswordStatus('Пароль сохранен ✅');
            setNewPassword('');
        }
        setIsPasswordLoading(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="text-[#E85D04] font-bold text-xl animate-pulse">goproxy</div></div>;

    // --- Вкладка МОИ ПРОКСИ (С ФИЛЬТРАМИ) ---
    const TabProxies = () => {
        // Локальные состояния фильтров
        const [search, setSearch] = useState('');
        const [statusFilter, setStatusFilter] = useState('all'); // all, active, expired
        const [countryFilter, setCountryFilter] = useState('all');
        const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest

        // Получаем список уникальных стран для фильтра
        const uniqueCountries = useMemo(() => {
            return [...new Set(myProxies.map(p => p.country))].filter(Boolean);
        }, []);

        // ЛОГИКА ФИЛЬТРАЦИИ
        const filteredProxies = useMemo(() => {
            return myProxies.filter(proxy => {
                // 1. Поиск (IP, Login, Port)
                const searchLower = search.toLowerCase();
                const matchSearch = 
                    proxy.ip.includes(searchLower) || 
                    String(proxy.port).includes(searchLower) || 
                    (proxy.login && proxy.login.toLowerCase().includes(searchLower));

                // 2. Страна
                const matchCountry = countryFilter === 'all' || proxy.country === countryFilter;

                // 3. Статус (Активен / Истек)
                // Если expires_at нет, считаем вечным (активным)
                const isExpired = proxy.expires_at && new Date(proxy.expires_at) < new Date();
                const matchStatus = 
                    statusFilter === 'all' ? true :
                    statusFilter === 'active' ? !isExpired :
                    statusFilter === 'expired' ? isExpired : true;

                return matchSearch && matchCountry && matchStatus;
            }).sort((a, b) => {
                // 4. Сортировка
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });
        }, [search, statusFilter, countryFilter, sortOrder]);

        // Функция скачивания отфильтрованных
        const handleDownload = () => {
            const text = filteredProxies.map(p => `${p.ip}:${p.port}:${p.login}:${p.password}`).join('\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `proxies_${filteredProxies.length}.txt`;
            a.click();
        };

        return (
            <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">Мои прокси ({filteredProxies.length} / {myProxies.length})</h2>
                    {filteredProxies.length > 0 && (
                        <button onClick={handleDownload} className="flex items-center gap-2 text-sm font-bold text-[#E85D04] hover:bg-orange-50 px-3 py-2 rounded-lg transition">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                            </svg>
                            Скачать список (.txt)
                        </button>
                    )}
                </div>

                {/* --- ПАНЕЛЬ ФИЛЬТРОВ (НОВАЯ) --- */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. ПОИСК */}
                    <div className="md:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Поиск</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="IP, порт..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full p-2.5 pl-9 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-[#E85D04] outline-none"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400 absolute left-3 top-3">
                                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* 2. СТАТУС */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Статус</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-[#E85D04] outline-none cursor-pointer"
                        >
                            <option value="all">Все</option>
                            <option value="active">✅ Активные</option>
                            <option value="expired">❌ Истекшие</option>
                        </select>
                    </div>

                    {/* 3. СТРАНА */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Страна</label>
                        <select 
                            value={countryFilter} 
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-[#E85D04] outline-none cursor-pointer"
                        >
                            <option value="all">Все страны</option>
                            {uniqueCountries.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* 4. СОРТИРОВКА */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Сортировка</label>
                        <select 
                            value={sortOrder} 
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-[#E85D04] outline-none cursor-pointer"
                        >
                            <option value="newest">Сначала новые</option>
                            <option value="oldest">Сначала старые</option>
                        </select>
                    </div>
                </div>

                {filteredProxies.length === 0 ? (
                    <div className="bg-white p-10 rounded-xl text-center border border-gray-200">
                        <p className="text-gray-500 mb-4">Ничего не найдено по вашим фильтрам.</p>
                        {myProxies.length === 0 && (
                            <Link href="/#tariffs" className="inline-block px-6 py-2 bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200]">
                                Купить прокси
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredProxies.map(proxy => {
                             const isExpired = proxy.expires_at && new Date(proxy.expires_at) < new Date();
                             return (
                                <div key={proxy.id} className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition hover:border-gray-300 ${isExpired ? 'border-red-100 opacity-70' : 'border-gray-200'}`}>
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <span className="font-mono font-black text-lg text-gray-900 select-all">{proxy.ip}:{proxy.port}</span>
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold uppercase">{proxy.type}</span>
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">{proxy.country}</span>
                                            {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">EXPIRED</span>}
                                        </div>
                                        <div className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded select-all flex items-center justify-between">
                                            <span>{proxy.login}:{proxy.password}</span>
                                            <span className="text-xs text-gray-300 ml-2">CLICK TO COPY</span>
                                        </div>
                                    </div>
                                    <div className="text-right min-w-[120px] w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end">
                                        <div className="text-xs text-gray-400 mb-1">Истекает:</div>
                                        <div className={`text-sm font-bold ${isExpired ? 'text-red-500' : 'text-gray-700'}`}>
                                            {proxy.expires_at ? new Date(proxy.expires_at).toLocaleDateString() : 'Бессрочно'}
                                        </div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const TabSupport = () => {
        const [message, setMessage] = useState('');
        const [isSending, setIsSending] = useState(false);

        const handleSendMessage = async () => {
            if (!message.trim()) return alert("Введите сообщение");
            setIsSending(true);
            try {
                const res = await fetch('/api/support', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, email: user.email, message: message })
                });
                if (res.ok) { alert("Сообщение отправлено!"); setMessage(''); } 
                else { alert("Ошибка отправки."); }
            } catch (e) { alert("Ошибка сети"); } finally { setIsSending(false); }
        };

        return (
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Техническая поддержка</h2>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-2xl">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#E85D04]">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Напишите нам</h3>
                            <p className="text-sm text-gray-500">Опишите проблему, и мы пришлем решение на вашу почту <b>{user.email}</b>.</p>
                        </div>
                    </div>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Суть проблемы..." className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#E85D04] mb-4 resize-none" />
                    <button onClick={handleSendMessage} disabled={isSending} className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg disabled:opacity-50 flex items-center gap-2">{isSending ? 'Отправка...' : 'Отправить обращение'}</button>
                </div>
            </div>
        );
    };

    const TabBalance = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Баланс</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md">
                <p className="text-sm text-gray-500 mb-2">Текущий счет</p>
                <div className="text-4xl font-extrabold text-gray-900 mb-8">${(balance / 100).toFixed(2)}</div>
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700">Сумма пополнения ($)</label>
                    <div className="flex gap-3">
                        <input type="number" placeholder="100" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:border-[#E85D04] focus:ring-1 focus:ring-[#E85D04]" />
                        <button onClick={handleTopUp} disabled={isProcessing} className="px-6 py-3 bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200] disabled:bg-gray-300 transition">{isProcessing ? '...' : 'Пополнить'}</button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col md:flex-row">
            <aside className="w-full md:w-64 bg-[#181818] text-white flex-shrink-0 md:min-h-screen">
                <div className="p-6 border-b border-[#333]">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative h-8 w-8"><Image src="/logo.png" alt="Logo" fill className="object-contain" /></div>
                        <span className="font-extrabold tracking-tighter text-xl">GO<span className="text-[#E85D04]">PROXY</span></span>
                    </Link>
                </div>
                <nav className="p-4 space-y-2">
                    <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'profile' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg> Профиль
                    </button>
                    <button onClick={() => setActiveTab('proxies')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'proxies' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 4.505a8.25 8.25 0 0111.636 11.636h-4.873L8.547 4.505zm-3.232 3.232a8.25 8.25 0 014.873 4.873H5.315v-4.873zm-1.06 6.373h4.873l6.764 6.764a8.25 8.25 0 01-11.637-11.637v4.873zM14.562 17.5l-6.764-6.764h4.873v4.873a8.25 8.25 0 001.891 1.891z" clipRule="evenodd" /></svg> Мои прокси
                    </button>
                    <button onClick={() => setActiveTab('balance')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'balance' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M10.464 2.314a1 1 0 00-1.928 0l-.7 3.492a1 1 0 00.954 1.194h.015L10.464 2.314zM10.064 7h2.736l-1.66 6.642a1 1 0 001.94 4.85l.7-3.492a1 1 0 00-.954-1.194h-.015l-1.66 6.642a1 1 0 00-1.94-4.85L10.064 7z" /><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v.756a8.225 8.225 0 014.288 1.956.75.75 0 01-.984 1.135 6.725 6.725 0 00-3.304-1.55V7.75c0 1.916 1.34 3.036 3.09 3.495l.406.107c1.472.387 1.754 1.077 1.754 1.9 0 1.258-1.296 2.05-3.25 2.195V17.25a.75.75 0 01-1.5 0v-1.785a8.225 8.225 0 01-4.288-1.957.75.75 0 01.984-1.134 6.725 6.725 0 003.304 1.55v-2.427c0-1.916-1.34-3.036-3.09-3.495l-.406-.107c-1.472-.387-1.754-1.077-1.754-1.9 0-1.258 1.296-2.05 3.25-2.195V3a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg> Баланс
                    </button>
                    <Link href="/profile/partners" className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold text-gray-400 hover:bg-gray-800 hover:text-white group">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E85D04] group-hover:text-white transition-colors"><path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" /><path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" /></svg> Партнерская программа
                    </Link>
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <Link href="/" className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold text-gray-400 hover:bg-gray-800 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E85D04]"><path d="M11.47 3.84a.75.75 0 011.06 0l8.635 8.635a.75.75 0 11-1.06 1.06l-.315-.315V20.25a.75.75 0 01-.75.75h-3.75a.75.75 0 01-.75-.75V14.25h-3v6a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-7.03l-.315.315a.75.75 0 11-1.06-1.06l8.635-8.635z" /></svg> На главную
                        </Link>
                    </div>
                </nav>
                <div className="mt-auto px-4 pb-2">
                    <button onClick={() => setActiveTab('support')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'support' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" /></svg> Поддержка
                    </button>
                </div>
                <div className="p-4 mt-auto border-t border-[#333]">
                    <button onClick={handleSignOut} className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-500 hover:text-white text-sm font-medium transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg> Выйти из аккаунта
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                {activeTab === 'profile' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Профиль пользователя</h2>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 border border-gray-200">{user.email ? user.email[0].toUpperCase() : 'U'}</div>
                                <div><p className="text-sm text-gray-500">Email</p><p className="text-lg font-bold text-gray-900">{user.email}</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100"><p className="text-sm text-gray-500">Куплено IP всего</p><p className="text-3xl font-extrabold text-[#E85D04]">{myProxies.length}</p></div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100"><p className="text-sm text-gray-500">Всего заказов</p><p className="text-3xl font-extrabold text-gray-900">{orders.length}</p></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Безопасность</h3>
                            <p className="text-sm text-gray-500 mb-4">Установите постоянный пароль для входа в аккаунт.</p>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/2 relative">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новый пароль</label>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#E85D04] pr-10" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>}
                                        </button>
                                    </div>
                                </div>
                                <button onClick={handleUpdatePassword} disabled={isPasswordLoading} className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg disabled:bg-gray-400">{isPasswordLoading ? '...' : 'Сохранить'}</button>
                            </div>
                            {passwordStatus && <p className="text-green-600 text-sm font-bold mt-3">{passwordStatus}</p>}
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100"><h3 className="text-xl font-bold text-gray-900">История операций</h3></div>
                            {orders.length === 0 ? <div className="p-8 text-center text-gray-500">История пуста</div> : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs"><tr><th className="px-6 py-3">Операция</th><th className="px-6 py-3">Сумма</th><th className="px-6 py-3">Статус</th><th className="px-6 py-3">Дата</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">{orders.map((order) => (<tr key={order.id} className="hover:bg-gray-50"><td className="px-6 py-3 font-medium text-gray-900">{order.product_name || 'Заказ'}</td><td className="px-6 py-3">${(order.amount_total / 100).toFixed(2)}</td><td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status === 'paid' ? 'Выполнено' : 'Ожидание'}</span></td><td className="px-6 py-3 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'proxies' && <TabProxies />}
                {activeTab === 'balance' && <TabBalance />}
                {activeTab === 'support' && <TabSupport />}
            </main>
        </div>
    );
}

