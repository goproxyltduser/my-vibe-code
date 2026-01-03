"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Данные для входа
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
   
    // Данные админки
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- ПРОВЕРКА СЕССИИ ПРИ ЗАГРУЗКЕ ---
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Проверяем, админ ли это
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.is_admin) {
                    setIsAuthenticated(true);
                    fetchData(); // Грузим данные сразу, если уже залогинен
                }
            }
        };
        checkSession();
    }, []);

    // --- ЛОГИН (ТЕПЕРЬ НАСТОЯЩИЙ) ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);

        try {
            // 1. Логинимся в Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // 2. Проверяем права админа
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', data.user.id)
                .single();

            if (!profile?.is_admin) {
                await supabase.auth.signOut();
                throw new Error("У этого аккаунта нет прав администратора.");
            }

            // 3. Успех
            setIsAuthenticated(true);
            fetchData();

        } catch (err) {
            setLoginError(err.message || "Ошибка входа");
            setIsAuthenticated(false);
        } finally {
            setIsLoggingIn(false);
        }
    };

    // --- ЗАГРУЗКА ДАННЫХ ---
    const fetchData = async () => {
        setLoading(true);
        // Благодаря RLS и авторизации, теперь база вернет всех юзеров
        const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        const { data: payoutsData } = await supabase.from('payout_requests').select('*').order('created_at', { ascending: false });
        const { data: ticketsData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });

        setUsers(usersData || []);
        setOrders(ordersData || []);
        setPayouts(payoutsData || []);
        setTickets(ticketsData || []);
        setLoading(false);
    };

    // --- ЛОГИКА: ВОЗВРАТ ---
    const handleRefund = async (orderId, amount, userId) => {
        if(!confirm("Сделать возврат?")) return;
        const user = users.find(u => u.id === userId);
        if (user && user.referred_by) {
            const partner = users.find(u => u.id === user.referred_by);
            if (partner) {
                const commissionToRevoke = (amount / 100) * 0.20;
                const newBalance = (partner.affiliate_balance || 0) - commissionToRevoke;
                await supabase.from('profiles').update({ affiliate_balance: newBalance }).eq('id', partner.id);
                await supabase.from('referral_earnings').insert([{
                    partner_id: partner.id,
                    source_user_id: userId,
                    amount: -commissionToRevoke,
                    order_amount: amount / 100,
                    percentage: 0,
                    status: 'refunded'
                }]);
            }
        }
        await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId);
        fetchData();
    };

    const handlePayout = async (id, status) => {
        if(!confirm(`Сменить статус на ${status}?`)) return;
        await supabase.from('payout_requests').update({ status }).eq('id', id);
        fetchData();
    };

    const handleUpdateProxy = async (orderId, newDataStr) => {
        try {
            const newData = JSON.parse(newDataStr);
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
            <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans text-black">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-96 border border-gray-200">
                    <h1 className="text-2xl font-black mb-6 text-center uppercase">Admin Login</h1>
                    
                    {loginError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-100">
                            {loginError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-3 border rounded focus:border-black outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-3 border rounded focus:border-black outline-none transition"
                                required
                            />
                        </div>
                        <button 
                            disabled={isLoggingIn}
                            className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition"
                        >
                            {isLoggingIn ? 'Вход...' : 'Войти в панель'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // --- ИНТЕРФЕЙС АДМИНКИ ---
    return (
        <div className="min-h-screen bg-gray-50 text-black font-sans">
            <header className="bg-black text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <div className="font-bold text-xl tracking-wider">GOPROXY <span className="text-[#E85D04]">ADMIN</span></div>
                <div className="flex gap-4 text-sm font-bold items-center">
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'users' ? 'bg-[#E85D04] text-white' : 'hover:bg-gray-800 text-gray-300'}`}>Пользователи</button>
                    <button onClick={() => setActiveTab('partners')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'partners' ? 'bg-[#E85D04] text-white' : 'hover:bg-gray-800 text-gray-300'}`}>Партнеры</button>
                    <button onClick={() => setActiveTab('payouts')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'payouts' ? 'bg-[#E85D04] text-white' : 'hover:bg-gray-800 text-gray-300'}`}>Вывод ({payouts.filter(p => p.status === 'pending').length})</button>
                    <button onClick={() => setActiveTab('tickets')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'tickets' ? 'bg-[#E85D04] text-white' : 'hover:bg-gray-800 text-gray-300'}`}>Тикеты</button>
                    <button onClick={() => fetchData()} className="hover:text-[#E85D04] ml-4">↻</button>
                    <button onClick={() => supabase.auth.signOut().then(() => setIsAuthenticated(false))} className="text-red-500 hover:text-red-400 ml-2">Выход</button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                {loading && <div className="text-center py-10 font-bold text-gray-400">Загрузка данных...</div>}

                {/* 1. ПОЛЬЗОВАТЕЛИ */}
                {!loading && activeTab === 'users' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black mb-6">Все пользователи ({users.length})</h2>
                        {users.map(user => {
                            const userOrders = orders.filter(o => o.user_id === user.id);
                            const totalSpent = userOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.amount_total, 0);
                            
                            return (
                                <details key={user.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group open:ring-2 ring-[#E85D04]/20 transition-all">
                                    <summary className="flex justify-between items-center cursor-pointer font-medium list-none">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">{user.email ? user.email[0].toUpperCase() : 'U'}</div>
                                            <div>
                                                <div className="font-bold">{user.email}</div>
                                                <div className="text-xs text-gray-400 font-mono">{user.id}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-8 text-sm items-center">
                                            <div className="text-gray-500">Заказов: <b className="text-black">{userOrders.length}</b></div>
                                            <div className="text-gray-500">Потратил: <b className="text-green-600">${(totalSpent/100).toFixed(2)}</b></div>
                                            <div className="text-gray-500">Баланс: <b className="text-black">${((user.balance || 0)/100).toFixed(2)}</b></div>
                                            <span className="text-gray-300 text-xs group-open:rotate-180 transition-transform">▼</span>
                                        </div>
                                    </summary>
                                   
                                    <div className="mt-6 pt-6 border-t border-gray-100 pl-4">
                                        <h3 className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">История заказов</h3>
                                        {userOrders.length === 0 ? <p className="text-sm text-gray-400 italic">Нет активных заказов</p> : (
                                            <div className="space-y-4">
                                                {userOrders.map(order => (
                                                    <div key={order.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm flex flex-col gap-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-base">{order.product_name} <span className="text-gray-400 font-normal">|</span> ${(order.amount_total/100).toFixed(2)}</span>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-700' : order.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                {order.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        {order.status === 'paid' && (
                                                            <div className="bg-white p-3 rounded border border-gray-200">
                                                                <textarea
                                                                    defaultValue={JSON.stringify(order.proxy_data, null, 2)}
                                                                    id={`json-${order.id}`}
                                                                    className="w-full text-xs font-mono p-2 border border-gray-100 rounded bg-gray-50 h-32 mb-3 outline-none focus:border-[#E85D04]"
                                                                />
                                                                <div className="flex gap-3">
                                                                    <button
                                                                        onClick={() => handleUpdateProxy(order.id, document.getElementById(`json-${order.id}`).value)}
                                                                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-xs font-bold transition"
                                                                    >
                                                                        Сохранить и Обновить
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRefund(order.id, order.amount_total, user.id)}
                                                                        className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-bold transition ml-auto"
                                                                    >
                                                                        Сделать возврат
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
                        <h2 className="text-2xl font-black mb-6">Топ Партнеры</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full bg-white rounded-xl shadow-sm text-sm text-left overflow-hidden">
                                <thead className="bg-gray-100 text-gray-500 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-4">Email</th>
                                        <th className="p-4 text-center">Пригласил</th>
                                        <th className="p-4">Баланс Партнера</th>
                                        <th className="p-4">ID / Ссылка</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.filter(u => users.some(r => r.referred_by === u.id)).map(partner => {
                                        const refCount = users.filter(r => r.referred_by === partner.id).length;
                                        return (
                                            <tr key={partner.id} className="hover:bg-gray-50 transition">
                                                <td className="p-4 font-bold text-gray-900">{partner.email}</td>
                                                <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">{refCount}</span></td>
                                                <td className="p-4 font-bold text-green-600">${partner.affiliate_balance?.toFixed(2)}</td>
                                                <td className="p-4 text-xs text-gray-400 font-mono select-all cursor-pointer hover:text-black">?ref={partner.id}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. ВЫПЛАТЫ */}
                {!loading && activeTab === 'payouts' && (
                    <div>
                        <h2 className="text-2xl font-black mb-6">Заявки на вывод</h2>
                        {payouts.map(p => {
                            const user = users.find(u => u.id === p.user_id);
                            return (
                                <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm mb-4 flex justify-between items-start border border-gray-100">
                                    <div>
                                        <div className="font-black text-2xl mb-1">${p.amount}</div> 
                                        <div className="text-sm font-bold text-gray-500 mb-4 bg-gray-50 inline-block px-2 py-1 rounded">Метод: {p.method}</div>
                                        
                                        <div className="text-sm text-gray-600 mb-1">Пользователь: <b className="text-black">{user?.email}</b></div>
                                        <div className="text-xs bg-gray-100 p-3 rounded font-mono select-all text-gray-800 border border-gray-200">{p.details}</div>
                                        <div className="text-xs text-gray-400 mt-2">{new Date(p.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="flex flex-col gap-3 min-w-[150px]">
                                        {p.status === 'pending' ? (
                                            <>
                                                <button onClick={() => handlePayout(p.id, 'paid')} className="px-4 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-200 transition">Оплачено ✅</button>
                                                <button onClick={() => handlePayout(p.id, 'rejected')} className="px-4 py-3 bg-white text-red-500 border border-red-100 rounded-xl font-bold hover:bg-red-50 transition">Отклонить</button>
                                            </>
                                        ) : (
                                            <span className={`px-4 py-2 rounded-xl font-bold text-center border ${p.status === 'paid' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                {p.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 4. ТИКЕТЫ */}
                {!loading && activeTab === 'tickets' && (
                    <div>
                        <h2 className="text-2xl font-black mb-6">Обращения</h2>
                        {tickets.map(t => (
                            <div key={t.id} className="bg-white p-6 rounded-xl shadow-sm mb-4 border border-gray-100">
                                <div className="flex justify-between mb-3 items-center">
                                    <span className="font-bold text-lg text-[#E85D04]">{t.email}</span>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{new Date(t.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-100 leading-relaxed">{t.message}</p>
                                <div className="mt-3 text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                                    <span>⚠️ Отвечать вручную на почту</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

