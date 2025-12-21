// src/app/admin/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// --- НАСТРОЙКИ ---
const ADMIN_PASSWORD = "RGxuSD9541+!)))"; // <--- ЗАМЕНИ НА СВОЙ ПАРОЛЬ!

export default function AdminPage() {
    // Состояния авторизации
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    
    // Состояния данных
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- АВТОРИЗАЦИЯ ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert("Неверный пароль");
        }
    };

    // --- ЗАГРУЗКА ВСЕХ ДАННЫХ ---
    const fetchData = async () => {
        setLoading(true);
        // 1. Юзеры
        const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        // 2. Заказы (для подсчета денег)
        const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        // 3. Выплаты
        const { data: payoutsData } = await supabase.from('payout_requests').select('*').order('created_at', { ascending: false });
        // 4. Тикеты
        const { data: ticketsData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });

        setUsers(usersData || []);
        setOrders(ordersData || []);
        setPayouts(payoutsData || []);
        setTickets(ticketsData || []);
        setLoading(false);
    };

    // --- ЛОГИКА: ВОЗВРАТ (ANTI-SCAM) ---
    const handleRefund = async (orderId, amount, userId) => {
        if(!confirm("Сделать возврат? Это отменит комиссию партнера!")) return;

        // 1. Ищем, кто был партнером
        const user = users.find(u => u.id === userId);
        if (user && user.referred_by) {
            // Находим партнера
            const partner = users.find(u => u.id === user.referred_by);
            if (partner) {
                // Считаем комиссию, которую надо отнять (20% или 10%)
                // Для простоты берем 20%, если это был первый заказ, но тут надо точно знать.
                // Чтобы не усложнять, отнимем макс (20%), лучше партнер уйдет в минус, чем мы.
                const commissionToRevoke = (amount / 100) * 0.20; 

                // Отнимаем баланс
                const newBalance = (partner.affiliate_balance || 0) - commissionToRevoke;
                
                await supabase.from('profiles').update({ affiliate_balance: newBalance }).eq('id', partner.id);
                
                // Добавляем запись в логи (с минусом)
                await supabase.from('referral_earnings').insert([{
                    partner_id: partner.id,
                    source_user_id: userId,
                    amount: -commissionToRevoke, // Минус
                    order_amount: amount / 100,
                    percentage: 0,
                    status: 'refunded'
                }]);
                
                alert(`Комиссия $${commissionToRevoke} списана у партнера!`);
            }
        }

        // 2. Меняем статус заказа
        await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId);
        fetchData();
    };

    // --- ЛОГИКА: ВЫПЛАТА ---
    const handlePayout = async (id, status) => {
        if(!confirm(`Сменить статус на ${status}?`)) return;
        await supabase.from('payout_requests').update({ status }).eq('id', id);
        fetchData();
    };

    // --- ЛОГИКА: УПРАВЛЕНИЕ ПРОКСИ ---
    // Для простоты мы редактируем JSON в базе. 
    // В будущем тут можно прикрутить API запрос к другу.
    const handleUpdateProxy = async (orderId, newDataStr) => {
        try {
            const newData = JSON.parse(newDataStr); // Проверяем валидность JSON
            await supabase.from('orders').update({ proxy_data: newData }).eq('id', orderId);
            alert("Прокси обновлены");
            fetchData();
        } catch (e) {
            alert("Ошибка JSON: " + e.message);
        }
    };


    // --- ЭКРАН ВХОДА ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-96">
                    <h1 className="text-2xl font-bold mb-4">GOPROXY ADMIN</h1>
                    <input 
                        type="password" 
                        value={passwordInput} 
                        onChange={e => setPasswordInput(e.target.value)} 
                        placeholder="Пароль" 
                        className="w-full p-3 border rounded mb-4"
                    />
                    <button className="w-full bg-black text-white p-3 rounded font-bold">Войти</button>
                </form>
            </div>
        );
    }

    // --- ИНТЕРФЕЙС АДМИНКИ ---
    return (
        <div className="min-h-screen bg-gray-50 text-black font-sans">
            {/* ШАПКА */}
            <header className="bg-black text-white p-4 flex justify-between items-center sticky top-0 z-50">
                <div className="font-bold text-xl">GOPROXY <span className="text-[#E85D04]">ADMIN</span></div>
                <div className="flex gap-4 text-sm font-bold">
                    <button onClick={() => setActiveTab('users')} className={`px-3 py-1 rounded ${activeTab === 'users' ? 'bg-[#E85D04]' : 'hover:bg-gray-800'}`}>Пользователи</button>
                    <button onClick={() => setActiveTab('partners')} className={`px-3 py-1 rounded ${activeTab === 'partners' ? 'bg-[#E85D04]' : 'hover:bg-gray-800'}`}>Партнеры</button>
                    <button onClick={() => setActiveTab('payouts')} className={`px-3 py-1 rounded ${activeTab === 'payouts' ? 'bg-[#E85D04]' : 'hover:bg-gray-800'}`}>Вывод ({payouts.filter(p => p.status === 'pending').length})</button>
                    <button onClick={() => setActiveTab('tickets')} className={`px-3 py-1 rounded ${activeTab === 'tickets' ? 'bg-[#E85D04]' : 'hover:bg-gray-800'}`}>Тикеты</button>
                    <button onClick={() => fetchData()} className="hover:text-[#E85D04]">↻ Обновить</button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                {loading && <div className="text-center py-10">Загрузка данных...</div>}

                {/* 1. ПОЛЬЗОВАТЕЛИ & ПРОКСИ */}
                {!loading && activeTab === 'users' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-4">Все пользователи ({users.length})</h2>
                        {users.map(user => {
                            // Данные юзера
                            const userOrders = orders.filter(o => o.user_id === user.id);
                            const totalSpent = userOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.amount_total, 0);
                            
                            return (
                                <details key={user.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 group open:ring-2 ring-[#E85D04]/20">
                                    <summary className="flex justify-between items-center cursor-pointer font-medium list-none">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold">{user.email ? user.email[0] : 'U'}</div>
                                            <div>
                                                <div>{user.email}</div>
                                                <div className="text-xs text-gray-400">{user.id}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                            <div>Заказов: <b>{userOrders.length}</b></div>
                                            <div>Потратил: <b className="text-green-600">${(totalSpent/100).toFixed(2)}</b></div>
                                            <div>Баланс: <b>${((user.balance || 0)/100).toFixed(2)}</b></div>
                                            <span className="text-gray-400 text-xs">▼</span>
                                        </div>
                                    </summary>
                                    
                                    {/* РАЗВЕРНУТАЯ ИНФА (УПРАВЛЕНИЕ) */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 pl-4">
                                        <h3 className="font-bold text-xs uppercase text-gray-500 mb-2">Активные заказы / Прокси</h3>
                                        {userOrders.length === 0 ? <p className="text-sm text-gray-400">Нет заказов</p> : (
                                            <div className="space-y-3">
                                                {userOrders.map(order => (
                                                    <div key={order.id} className="bg-gray-50 p-3 rounded text-sm flex flex-col gap-2">
                                                        <div className="flex justify-between">
                                                            <span className="font-bold">{order.product_name} | ${(order.amount_total/100).toFixed(2)}</span>
                                                            <span className={`px-2 rounded text-xs ${order.status === 'paid' ? 'bg-green-200 text-green-800' : 'bg-yellow-200'}`}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                        {/* РЕДАКТОР ПРОКСИ (JSON) */}
                                                        {order.status === 'paid' && (
                                                            <div>
                                                                <textarea 
                                                                    defaultValue={JSON.stringify(order.proxy_data, null, 2)}
                                                                    id={`json-${order.id}`}
                                                                    className="w-full text-xs font-mono p-2 border rounded h-24 mb-2"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => handleUpdateProxy(order.id, document.getElementById(`json-${order.id}`).value)}
                                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                                                                    >
                                                                        Сохранить JSON (Выдать/Продлить)
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleRefund(order.id, order.amount_total, user.id)}
                                                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                                                                    >
                                                                        REFUND (Скамеры)
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                )}

                {/* 2. ПАРТНЕРЫ */}
                {!loading && activeTab === 'partners' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Активные партнеры</h2>
                        <table className="w-full bg-white rounded shadow text-sm text-left">
                            <thead className="bg-gray-100 text-gray-500">
                                <tr>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Пригласил</th>
                                    <th className="p-3">Баланс Партнера</th>
                                    <th className="p-3">Реф. ссылка</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(u => {
                                    // Считаем рефералов для каждого
                                    const refCount = users.filter(r => r.referred_by === u.id).length;
                                    u.refCount = refCount; // сохраняем
                                    return refCount > 0;
                                }).map(partner => (
                                    <tr key={partner.id} className="border-t">
                                        <td className="p-3 font-bold">{partner.email}</td>
                                        <td className="p-3 text-center badge"><span className="bg-blue-100 text-blue-800 px-2 rounded">{partner.refCount} чел.</span></td>
                                        <td className="p-3 font-bold text-green-600">${partner.affiliate_balance?.toFixed(2)}</td>
                                        <td className="p-3 text-xs text-gray-400 select-all">?ref={partner.id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 3. ВЫПЛАТЫ */}
                {!loading && activeTab === 'payouts' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Заявки на вывод</h2>
                        {payouts.map(p => {
                            const user = users.find(u => u.id === p.user_id);
                            return (
                                <div key={p.id} className="bg-white p-4 rounded shadow mb-2 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-lg">${p.amount} <span className="text-sm font-normal text-gray-500">via {p.method}</span></div>
                                        <div className="text-sm text-gray-600">Юзер: <b>{user?.email}</b></div>
                                        <div className="text-xs bg-gray-100 p-1 rounded mt-1 font-mono select-all">{p.details}</div>
                                        <div className="text-xs text-gray-400 mt-1">{new Date(p.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {p.status === 'pending' && (
                                            <>
                                                <button onClick={() => handlePayout(p.id, 'paid')} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">Оплачено ✅</button>
                                                <button onClick={() => handlePayout(p.id, 'rejected')} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Отклонить ❌</button>
                                            </>
                                        )}
                                        {p.status !== 'pending' && (
                                            <span className={`px-3 py-1 rounded font-bold text-center ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {p.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 4. ТИКЕТЫ (ТЕХПОДДЕРЖКА) */}
                {!loading && activeTab === 'tickets' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Обращения с сайта</h2>
                        {tickets.map(t => (
                            <div key={t.id} className="bg-white p-4 rounded shadow mb-2">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-[#E85D04]">{t.email}</span>
                                    <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded">{t.message}</p>
                                <div className="mt-2 text-xs text-gray-400">Отвечать на почту вручную</div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

