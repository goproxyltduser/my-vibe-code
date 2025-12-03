// src/app/profile/page.js
"use client";

import { useState, useEffect } from 'react';
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
     // НОВЫЕ СОСТОЯНИЯ ДЛЯ ПАРОЛЯ
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
            if (userOrders) setOrders(userOrders);

            // 3. Загружаем КУПЛЕННЫЕ ПРОКСИ (Склад)
                   // 3. Загружаем КУПЛЕННЫЕ ПРОКСИ (Восстановление)
            const { data: proxies } = await supabase
                .from('proxy_pool')
                .select('*')
                .eq('owner_id', user.id) 
                .eq('is_sold', true);    
            
            if (proxies) setMyProxies(proxies);


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
            if (response.ok) window.location.assign(data.url);
            else alert(`Ошибка: ${data.error}`);
        } catch (error) {
            alert('Ошибка сети.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="text-[#E85D04] font-bold text-xl animate-pulse">Загрузка...</div></div>;
        // ФУНКЦИЯ СМЕНЫ ПАРОЛЯ
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



    // --- Вкладка ПРОФИЛЬ (Статистика) ---
    const TabProfile = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Профиль пользователя</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 border border-gray-200">
                        {user.email ? user.email[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-lg font-bold text-gray-900">{user.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-500">Активных прокси</p>
                        <p className="text-3xl font-extrabold text-[#E85D04]">{myProxies.length}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-500">Всего заказов</p>
                        <p className="text-3xl font-extrabold text-gray-900">{orders.length}</p>
                    </div>
                </div>
            </div>
           {/* БЛОК БЕЗОПАСНОСТИ (СМЕНА ПАРОЛЯ) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Безопасность</h3>
                <p className="text-sm text-gray-500 mb-4">Установите постоянный пароль для входа в аккаунт.</p>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новый пароль</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#E85D04]" 
                        />
                    </div>
                    <button 
                        onClick={handleUpdatePassword}
                        disabled={isPasswordLoading}
                        className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg disabled:bg-gray-400"
                    >
                        {isPasswordLoading ? 'Сохранение...' : 'Сохранить пароль'}
                    </button>
                </div>
                {passwordStatus && <p className="text-green-600 text-sm font-bold mt-3">{passwordStatus}</p>}
            </div>


            {/* История последних операций */}
            <h3 className="text-xl font-bold text-gray-900 mb-4">История операций</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Операция</th>
                                <th className="px-6 py-3">Сумма</th>
                                <th className="px-6 py-3">Статус</th>
                                <th className="px-6 py-3">Дата</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 font-medium text-gray-900">{order.product_name}</td>
                                    <td className="px-6 py-3">${(order.amount_total / 100).toFixed(2)}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {order.status === 'paid' ? 'Выполнено' : 'Ожидание'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // --- Вкладка МОИ ПРОКСИ (Выдача товара) ---
       const TabProxies = () => (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Мои прокси ({myProxies.length})</h2>
                {myProxies.length > 0 && (
                    <button 
                        onClick={() => {
                            const text = myProxies.map(p => `${p.ip}:${p.port}:${p.login}:${p.password}`).join('\n');
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'proxies.txt';
                            a.click();
                        }}
                        className="text-sm font-bold text-[#E85D04] hover:underline"
                    >
                        Скачать всё (.txt)
                    </button>
                )}
            </div>

            {myProxies.length === 0 ? (
                <div className="bg-white p-10 rounded-xl text-center border border-gray-200">
                    <p className="text-gray-500 mb-4">Активных прокси не найдено.</p>
                    <Link href="/#tariffs" className="inline-block px-6 py-2 bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200]">
                        Купить прокси
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* ВАЖНО: Мы перебираем массив myProxies */}
                    {myProxies.map(proxy => (
                        <div key={proxy.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono font-bold text-lg text-gray-900 select-all">{proxy.ip}:{proxy.port}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">{proxy.type}</span>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">{proxy.country}</span>
                                </div>
                                <div className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded select-all">
                                    Login: <span className="text-gray-900">{proxy.login}</span> &nbsp;|&nbsp; Pass: <span className="text-gray-900">{proxy.password}</span>
                                </div>
                            </div>
                            <div className="text-right min-w-[120px]">
                                <div className="text-xs text-gray-400 mb-1">Истекает:</div>
                                <div className="text-sm font-bold text-gray-700">
                                    {proxy.expires_at ? new Date(proxy.expires_at).toLocaleDateString() : 'Бессрочно'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );



    // --- Вкладка БАЛАНС ---
    const TabBalance = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Баланс</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md">
                <p className="text-sm text-gray-500 mb-2">Текущий счет</p>
                <div className="text-4xl font-extrabold text-gray-900 mb-8">${(balance / 100).toFixed(2)}</div>
               
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700">Сумма пополнения ($)</label>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            placeholder="100"
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:border-[#E85D04] focus:ring-1 focus:ring-[#E85D04]"
                        />
                        <button
                            onClick={handleTopUp}
                            disabled={isProcessing}
                            className="px-6 py-3 bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200] disabled:bg-gray-300 transition"
                        >
                            {isProcessing ? '...' : 'Пополнить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col md:flex-row">
            {/* SIDEBAR (ОБНОВЛЕННЫЙ ДИЗАЙН) */}
            <aside className="w-full md:w-64 bg-[#181818] text-white flex-shrink-0 md:min-h-screen">
                <div className="p-6 border-b border-[#333]">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative h-8 w-8">
                             <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                        <span className="font-extrabold tracking-tighter text-xl">GO<span className="text-[#E85D04]">PROXY</span></span>
                    </Link>
                </div>
                
                {/* МЕНЮ НАВИГАЦИИ */}
                <nav className="p-4 space-y-2">
                    
                    {/* 1. ПРОФИЛЬ */}
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'profile' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-[#E85D04]'}`}>
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                        </svg>
                        Профиль
                    </button>

                    {/* 2. МОИ ПРОКСИ */}
                    <button
                        onClick={() => setActiveTab('proxies')}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'proxies' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${activeTab === 'proxies' ? 'text-white' : 'text-[#E85D04]'}`}>
                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 4.505a8.25 8.25 0 0111.636 11.636h-4.873L8.547 4.505zm-3.232 3.232a8.25 8.25 0 014.873 4.873H5.315v-4.873zm-1.06 6.373h4.873l6.764 6.764a8.25 8.25 0 01-11.637-11.637v4.873zM14.562 17.5l-6.764-6.764h4.873v4.873a8.25 8.25 0 001.891 1.891z" clipRule="evenodd" />
                        </svg>
                        Мои прокси
                    </button>

                    {/* 3. БАЛАНС */}
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold ${activeTab === 'balance' ? 'bg-[#E85D04] text-white shadow-lg shadow-[#E85D04]/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${activeTab === 'balance' ? 'text-white' : 'text-[#E85D04]'}`}>
                            <path d="M10.464 2.314a1 1 0 00-1.928 0l-.7 3.492a1 1 0 00.954 1.194h.015L10.464 2.314zM10.064 7h2.736l-1.66 6.642a1 1 0 001.94 4.85l.7-3.492a1 1 0 00-.954-1.194h-.015l-1.66 6.642a1 1 0 00-1.94-4.85L10.064 7z" />
                            <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v.756a8.225 8.225 0 014.288 1.956.75.75 0 01-.984 1.135 6.725 6.725 0 00-3.304-1.55V7.75c0 1.916 1.34 3.036 3.09 3.495l.406.107c1.472.387 1.754 1.077 1.754 1.9 0 1.258-1.296 2.05-3.25 2.195V17.25a.75.75 0 01-1.5 0v-1.785a8.225 8.225 0 01-4.288-1.957.75.75 0 01.984-1.134 6.725 6.725 0 003.304 1.55v-2.427c0-1.916-1.34-3.036-3.09-3.495l-.406-.107c-1.472-.387-1.754-1.077-1.754-1.9 0-1.258 1.296-2.05 3.25-2.195V3a.75.75 0 01.75-.75z" clipRule="evenodd" />
                        </svg>
                        Баланс
                    </button>
                    
                    {/* 4. КНОПКА "НА ГЛАВНУЮ" (С разделителем) */}
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <Link href="/" className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold text-gray-400 hover:bg-gray-800 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E85D04]">
                                <path d="M11.47 3.84a.75.75 0 011.06 0l8.635 8.635a.75.75 0 11-1.06 1.06l-.315-.315V20.25a.75.75 0 01-.75.75h-3.75a.75.75 0 01-.75-.75V14.25h-3v6a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-7.03l-.315.315a.75.75 0 11-1.06-1.06l8.635-8.635z" />
                            </svg>
                            На главную
                        </Link>
                    </div>

                </nav>

                {/* КНОПКА ВЫХОДА */}
                <div className="p-4 mt-auto border-t border-[#333]">
                    <button onClick={handleSignOut} className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-500 hover:text-white text-sm font-medium transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Выйти из аккаунта
                    </button>
                </div>
            </aside>

            {/* CONTENT */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                                  {/* --- ВКЛАДКА ПРОФИЛЬ (ИСПРАВЛЕННАЯ) --- */}
                {activeTab === 'profile' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Профиль пользователя</h2>
                        
                        {/* КАРТОЧКА С ДАННЫМИ */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 border border-gray-200">
                                    {user.email ? user.email[0].toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="text-lg font-bold text-gray-900">{user.email}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-sm text-gray-500">Куплено IP всего</p>
                                                                       {/* БЫЛО: orders.length -> СТАЛО: myProxies.length */}
                                    <p className="text-3xl font-extrabold text-[#E85D04]">{myProxies.length}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-sm text-gray-500">Всего заказов</p>
                                    {/* Здесь показываем количество заказов */}
                                    <p className="text-3xl font-extrabold text-gray-900">{orders.length}</p>


                                </div>
                            </div>
                        </div>

                        {/* БЛОК СМЕНЫ ПАРОЛЯ С ГЛАЗКОМ */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Безопасность</h3>
                            <p className="text-sm text-gray-500 mb-4">Установите постоянный пароль для входа в аккаунт.</p>
                            
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-full md:w-1/2 relative">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новый пароль</label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#E85D04] pr-10" 
                                        />
                                        {/* КНОПКА ГЛАЗ */}
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleUpdatePassword}
                                    disabled={isPasswordLoading}
                                    className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg disabled:bg-gray-400"
                                >
                                    {isPasswordLoading ? '...' : 'Сохранить'}
                                </button>
                            </div>
                            {passwordStatus && <p className="text-green-600 text-sm font-bold mt-3">{passwordStatus}</p>}
                             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">История операций</h3>
                </div>
                {orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">История пуста</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Операция</th>
                                    <th className="px-6 py-3">Сумма</th>
                                    <th className="px-6 py-3">Статус</th>
                                    <th className="px-6 py-3">Дата</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-900">{order.product_name || 'Заказ'}</td>
                                        <td className="px-6 py-3">${(order.amount_total / 100).toFixed(2)}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {order.status === 'paid' ? 'Выполнено' : 'Ожидание'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

                        </div>
                    </div>
                )}
                


                {activeTab === 'proxies' && <TabProxies />}
                {activeTab === 'balance' && <TabBalance />}
            </main>
        </div>
    );
}

