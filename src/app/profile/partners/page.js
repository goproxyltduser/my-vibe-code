// src/app/profile/partners/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PartnersPage() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        balance: 0,
        totalEarned: 0,
        referralsCount: 0,
        earningsHistory: [],
        payoutsHistory: [],
        referralsList: [] // <--- НОВОЕ ПОЛЕ: Список людей
    });
    const [loading, setLoading] = useState(true);

    // Для модалки вывода
    const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('USDT TRC20');
    const [withdrawDetails, setWithdrawDetails] = useState('');
    const [withdrawProcessing, setWithdrawProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; 
        setUser(user);

        // 1. Берем профиль (баланс)
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        // 2. Считаем количество рефералов
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id);

        // 3. История начислений
        const { data: earnings } = await supabase.from('referral_earnings').select('*').eq('partner_id', user.id).order('created_at', { ascending: false });

        // 4. История выводов
        const { data: payouts } = await supabase.from('payout_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

        // 5. НОВОЕ: Загружаем список рефералов
        const { data: referrals } = await supabase
            .from('profiles')
            .select('id, email, created_at')
            .eq('referred_by', user.id)
            .order('created_at', { ascending: false });

        // Объединяем рефералов с их доходом
        // Пробегаем по каждому рефералу и считаем сумму из таблицы earnings, где source_user_id == реферал
        const referralsWithStats = referrals?.map(ref => {
            const totalFromUser = earnings
                ?.filter(e => e.source_user_id === ref.id)
                .reduce((acc, curr) => acc + curr.amount, 0) || 0;
            
            return {
                ...ref,
                totalProfit: totalFromUser
            };
        }) || [];

        // Считаем "Заработано всего"
        const total = earnings?.reduce((acc, item) => acc + item.amount, 0) || 0;

        setStats({
            balance: profile?.affiliate_balance || 0,
            totalEarned: total,
            referralsCount: count || 0,
            earningsHistory: earnings || [],
            payoutsHistory: payouts || [],
            referralsList: referralsWithStats // Сохраняем готовый список
        });
        setLoading(false);
    };

    // Функция для скрытия части почты (user***@gmail.com)
    const maskEmail = (email) => {
        if (!email) return 'User';
        const [name, domain] = email.split('@');
        const visible = name.slice(0, 3);
        return `${visible}***@${domain}`;
    };

    const copyLink = () => {
        const link = `https://goproxy.tech/?ref=${user?.id}`;
        navigator.clipboard.writeText(link);
        alert("Ссылка скопирована!");
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || !withdrawDetails) return alert("Заполните все поля");
        const amount = parseFloat(withdrawAmount);
        if (amount > stats.balance) return alert("Недостаточно средств");
        
        setWithdrawProcessing(true);
        
        const res = await fetch('/api/payout', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userId: user.id,
                amount,
                method: withdrawMethod,
                details: withdrawDetails
            })
        });
        
        const data = await res.json();
        setWithdrawProcessing(false);
        
        if (data.success) {
            alert("Заявка создана! Мы обработаем её в течение 24 часов.");
            setWithdrawModalOpen(false);
            fetchData(); 
        } else {
            alert(data.error || "Ошибка");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Загрузка данных...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black uppercase text-[#1E293B]">Партнерская программа</h1>
                    <Link href="/profile" className="text-gray-500 hover:text-[#E85D04] font-bold">← В кабинет</Link>
                </div>

                {/* КАРТОЧКИ СТАТИСТИКИ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-gray-400 text-xs font-bold uppercase mb-2">Доступно к выводу</p>
                            <p className="text-4xl font-black text-[#E85D04] mb-4">${stats.balance.toFixed(2)}</p>
                            <button 
                                onClick={() => setWithdrawModalOpen(true)}
                                className="w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition shadow-lg"
                            >
                                Вывести деньги
                            </button>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <p className="text-gray-400 text-xs font-bold uppercase mb-2">Приглашено людей</p>
                        <p className="text-4xl font-black text-[#1E293B]">{stats.referralsCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <p className="text-gray-400 text-xs font-bold uppercase mb-2">Всего заработано</p>
                        <p className="text-4xl font-black text-green-600">${stats.totalEarned.toFixed(2)}</p>
                    </div>
                </div>

                {/* ССЫЛКА */}
                <div className="bg-[#E85D04]/5 border border-[#E85D04]/20 p-8 rounded-2xl mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="font-bold text-xl mb-2 text-[#E85D04]">Ваша реферальная ссылка</h3>
                        <p className="text-sm text-gray-600 font-medium max-w-lg">Делитесь ссылкой и получайте <span className="text-black">20%</span> с первой покупки и <span className="text-black">10%</span> со всех остальных пожизненно.</p>
                    </div>
                    <div className="flex w-full md:w-auto bg-white rounded-xl border border-[#E85D04]/30 p-1.5 shadow-sm">
                        <input 
                            readOnly 
                            value={`https://goproxy.tech/?ref=${user?.id}`} 
                            className="bg-transparent px-4 py-2 text-sm w-full md:w-80 outline-none text-gray-600 font-mono"
                        />
                        <button onClick={copyLink} className="bg-[#E85D04] hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition">
                            Копировать
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* ТАБЛИЦА РЕФЕРАЛОВ (НОВОЕ) */}
                    <div>
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                            Мои рефералы
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{stats.referralsList.length}</span>
                        </h3>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[200px]">
                            {stats.referralsList.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                    <p className="text-gray-400 text-sm mb-4">У вас пока нет рефералов</p>
                                    <button onClick={copyLink} className="text-[#E85D04] font-bold text-sm hover:underline">Скопировать ссылку</button>
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Пользователь</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Регистрация</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Принес вам</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats.referralsList.map((ref) => (
                                                <tr key={ref.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4 text-sm font-bold text-gray-700">{maskEmail(ref.email)}</td>
                                                    <td className="p-4 text-xs text-gray-400">{new Date(ref.created_at).toLocaleDateString()}</td>
                                                    <td className="p-4 text-sm font-bold text-green-600 text-right">
                                                        {ref.totalProfit > 0 ? `+$${ref.totalProfit.toFixed(2)}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ТАБЛИЦА НАЧИСЛЕНИЙ */}
                    <div>
                        <h3 className="font-bold text-xl mb-4">История начислений</h3>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[200px]">
                            {stats.earningsHistory.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                    <p className="text-gray-400 text-sm">Начислений пока нет</p>
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                            <tr>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Дата</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Заказ</th>
                                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Доход</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats.earningsHistory.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4 text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                                    <td className="p-4 text-sm text-gray-600">
                                                        ${item.order_amount} <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded ml-1">{item.percentage}%</span>
                                                    </td>
                                                    <td className="p-4 text-sm font-bold text-green-600 text-right">+${item.amount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
                
                {/* ТАБЛИЦА ВЫВОДОВ (Снизу, на всю ширину) */}
                <div className="mt-10">
                    <h3 className="font-bold text-xl mb-4">История выводов</h3>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {stats.payoutsHistory.length === 0 ? (
                            <p className="p-6 text-gray-400 text-center text-sm">Заявок на вывод не было</p>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Дата</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Сумма</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Реквизиты</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Статус</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats.payoutsHistory.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-4 text-sm text-gray-600">{new Date(item.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 text-sm font-bold">${item.amount}</td>
                                            <td className="p-4 text-sm text-gray-600">{item.method} ({item.details})</td>
                                            <td className="p-4 text-sm text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                                    item.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {item.status === 'pending' ? 'Ожидает' : item.status === 'paid' ? 'Выплачено' : 'Отклонено'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* МОДАЛКА ВЫВОДА */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
                         <button 
                            onClick={() => setWithdrawModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition"
                        >✕</button>
                        
                        <h2 className="text-2xl font-black mb-6 uppercase">Заявка на вывод</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Сумма ($)</label>
                                <input 
                                    type="number" 
                                    value={withdrawAmount} 
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    className="w-full border border-gray-200 p-4 rounded-xl outline-none focus:border-[#E85D04] font-bold text-lg"
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">Максимум: ${stats.balance.toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Метод</label>
                                <select 
                                    value={withdrawMethod} 
                                    onChange={e => setWithdrawMethod(e.target.value)}
                                    className="w-full border border-gray-200 p-4 rounded-xl outline-none focus:border-[#E85D04] bg-white cursor-pointer"
                                >
                                    <option>USDT TRC20</option>
                                    <option>Карта РФ (Rub)</option>
                                    <option>СБП</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Реквизиты</label>
                                <input 
                                    type="text" 
                                    value={withdrawDetails} 
                                    onChange={e => setWithdrawDetails(e.target.value)}
                                    className="w-full border border-gray-200 p-4 rounded-xl outline-none focus:border-[#E85D04]"
                                    placeholder="Адрес кошелька или номер карты"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setWithdrawModalOpen(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">Отмена</button>
                            <button onClick={handleWithdraw} disabled={withdrawProcessing} className="flex-1 py-4 bg-[#E85D04] hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-lg">
                                {withdrawProcessing ? 'Отправка...' : 'Создать заявку'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

