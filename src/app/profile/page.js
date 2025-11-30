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
            const { data: proxies } = await supabase
                .from('proxy_pool')
                .select('*')
                .eq('owner_id', user.id) // Только мои
                .eq('is_sold', true);    // Только проданные мне
            
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
                <h2 className="text-2xl font-bold text-gray-900">Мои прокси</h2>
                <button 
                    onClick={() => {
                        // Простая логика скачивания в TXT
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
            </div>

            {myProxies.length === 0 ? (
                <div className="bg-white p-10 rounded-xl text-center border border-gray-200">
                    <p className="text-gray-500 mb-4">У вас пока нет активных прокси.</p>
                    <Link href="/#tariffs" className="inline-block px-6 py-2 bg-[#E85D04] text-white font-bold rounded-lg hover:bg-[#cc5200]">
                        Купить прокси
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {myProxies.map(proxy => (
                        <div key={proxy.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono font-bold text-lg text-gray-900">{proxy.ip}:{proxy.port}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{proxy.type}</span>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{proxy.country}</span>
                                </div>
                                <div className="text-sm text-gray-500 font-mono">
                                    Login: <span className="text-gray-800">{proxy.login}</span> &nbsp;|&nbsp; Pass: <span className="text-gray-800">{proxy.password}</span>
                                </div>
                            </div>
                            <div className="text-right">
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
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-[#181818] text-white flex-shrink-0 md:min-h-screen">
                <div className="p-6 border-b border-[#333]">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative h-8 w-8">
                             <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                        <span className="font-extrabold tracking-tighter text-xl">GO<span className="text-[#E85D04]">PROXY</span></span>
                    </Link>
                </div>
                <nav className="p-4 space-y-2">
                    <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'profile' ? 'bg-[#E85D04] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}>👤 Профиль</button>
                    <button onClick={() => setActiveTab('proxies')} className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'proxies' ? 'bg-[#E85D04] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}>🌐 Мои прокси</button>
                    <button onClick={() => setActiveTab('balance')} className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${activeTab === 'balance' ? 'bg-[#E85D04] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}>💰 Баланс</button>
                </nav>
                <div className="p-4 mt-auto border-t border-[#333]">
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-gray-500 hover:text-white text-sm font-medium transition">← Выйти из аккаунта</button>
                </div>
            </aside>

            {/* CONTENT */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                {activeTab === 'profile' && <TabProfile />}
                {activeTab === 'proxies' && <TabProxies />}
                {activeTab === 'balance' && <TabBalance />}
            </main>
        </div>
    );
}

