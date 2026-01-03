// src/app/checkout/page.js
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.js';
import Link from 'next/link';

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>goproxy</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const productName = searchParams.get('product') || searchParams.get('name') || 'Прокси';
    const productId = searchParams.get('id');
   
    const rawPrice = parseFloat(searchParams.get('price') || '0');
    const priceCents = Math.round(rawPrice * 100);

    const quantity = searchParams.get('qty');
    const period = searchParams.get('period');
    const country = searchParams.get('country');

    const [email, setEmail] = useState('');
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
   
    const [paymentProvider, setPaymentProvider] = useState('dvnet');
    const [paymentMethod, setPaymentMethod] = useState('gateway'); // 'gateway' или 'balance'

    // --- МЕТРИКА 1: Фиксируем начало оформления ---
    useEffect(() => {
        if (priceCents > 0) {
            if (typeof window !== 'undefined' && window.dataLayer) {
                window.dataLayer.push({
                    "ecommerce": {
                        "checkout": {
                            "actionField": { "step": 1 },
                            "products": [{
                                "id": productId || productName,
                                "name": productName,
                                "price": priceCents / 100,
                                "quantity": parseInt(quantity) || 1,
                                "category": "Proxy"
                            }]
                        }
                    }
                });
            }
        }
    }, [priceCents, productName, productId, quantity]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setEmail(user.email);
                const { data: p } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
                if (p) setBalance(p.balance);
            }
            setLoading(false);
        };
        init();
    }, []);

    const handlePay = async () => {
        if (!email.includes('@')) {
            alert('Введите корректный Email');
            return;
        }
        setProcessing(true);

        // --- МЕТРИКА 2: Фиксируем выбор оплаты ---
        if (typeof window !== 'undefined' && window.dataLayer) {
            window.dataLayer.push({
                "ecommerce": {
                    "checkout": {
                        "actionField": {
                            "step": 2,
                            "option": paymentMethod === 'balance' ? 'Balance' : paymentProvider
                        },
                        "products": [{
                            "id": productId || productName,
                            "name": productName,
                            "price": priceCents / 100,
                            "quantity": parseInt(quantity) || 1,
                            "category": "Proxy"
                        }]
                    }
                }
            });
        }
       
        const endpoint = paymentMethod === 'balance' ? '/api/purchase' : '/api/checkout';

        // --- ЛОГИКА РЕФЕРАЛОВ: Достаем ID из памяти браузера ---
        const referralId = typeof window !== 'undefined' ? localStorage.getItem('referral_id') : null;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    email: email,
                    product: { name: productName, id: productId },
                    quantity, period, country, amountCents: priceCents,
                    provider: paymentProvider,
                    referralId: referralId // <--- ОТПРАВЛЯЕМ РЕФЕРАЛА НА СЕРВЕР
                })
            });

            const data = await res.json();

            if (paymentMethod === 'balance') {
                if (data.success) {
                    // --- МЕТРИКА 3: Покупка с баланса ---
                    if (typeof window !== 'undefined' && window.dataLayer) {
                        window.dataLayer.push({
                            "ecommerce": {
                                "purchase": {
                                    "actionField": {
                                        "id": "balance_" + Math.floor(Math.random() * 100000),
                                        "revenue": priceCents / 100
                                    },
                                    "products": [{
                                        "id": productId || productName,
                                        "name": productName,
                                        "price": priceCents / 100,
                                        "quantity": parseInt(quantity) || 1,
                                        "category": "Proxy"
                                    }]
                                }
                            }
                        });
                    }

                    window.location.href = '/profile';
                } else {
                    alert('Ошибка: ' + data.error);
                }
            } else {
                if (res.ok && data.url) window.location.assign(data.url);
                else alert('Ошибка: ' + (data.error || 'Не удалось создать ссылку'));
            }
        } catch (e) {
            alert('Ошибка сети');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">Загрузка...</div>;

    return (
        <main className="min-h-screen bg-[#F8FAFC] font-sans text-[#1E293B] p-4 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100">
                <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                    <h1 className="text-2xl font-black uppercase">Оформление</h1>
                    <Link href="/" className="text-sm text-gray-400 hover:text-[#E85D04]">✕ Отмена</Link>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Товар:</span><span className="font-bold">{productName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Детали:</span><span>{quantity} шт. / {country} / {period} мес.</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 text-lg"><span className="font-bold">К оплате:</span><span className="font-black text-[#000000]">${(priceCents / 100).toFixed(2)}</span></div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user} placeholder="mail@example.com" className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-[#E85D04] outline-none transition" />
                    {!user && <p className="text-xs text-gray-400 mt-2 ml-1">Аккаунт будет создан автоматически, доступ придет на email.</p>}
                </div>

                <div className="mb-8 space-y-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Способ оплаты</label>
                   
                                       <button
                        onClick={() => { setPaymentMethod('gateway'); setPaymentProvider('freekassa'); }}
                        className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition ${paymentProvider === 'freekassa' && paymentMethod === 'gateway' ? 'border-[#E85D04] bg-orange-50/50' : 'border-gray-100 hover:border-gray-300'}`}
                    >
                        <span className="font-bold flex items-center gap-2">
                           FreeKassa <span className="text-xs font-normal text-gray-500">(Карты РФ/Visa/Mastercard, СБП, crypto)</span>
                        </span>
                        {paymentProvider === 'freekassa' && paymentMethod === 'gateway' && <span className="text-[#E85D04]">✔</span>}
                    </button>



                    <button
                        onClick={() => { setPaymentMethod('gateway'); setPaymentProvider('lava'); }}
                        className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition ${paymentProvider === 'lava' && paymentMethod === 'gateway' ? 'border-[#702cf9] bg-purple-50' : 'border-gray-100 hover:border-gray-300'}`}
                    >
                        <span className="font-bold">Lava.ru (СБП, Карты РФ)</span>
                        {paymentProvider === 'lava' && paymentMethod === 'gateway' && <span className="text-[#702cf9]">✔</span>}
                    </button>

                    <button
                        onClick={() => balance >= priceCents && setPaymentMethod('balance')}
                        disabled={balance < priceCents}
                        className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition ${
                            balance < priceCents ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' :
                            paymentMethod === 'balance' ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-left">
                            <span className="font-bold block">С баланса</span>
                            <span className="text-xs text-gray-500">Доступно: ${(balance / 100).toFixed(2)}</span>
                        </div>
                        {paymentMethod === 'balance' && <span className="text-green-600">✔</span>}
                    </button>
                </div>

                <button onClick={handlePay} disabled={processing} className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg text-lg">
                    {processing ? 'Обработка...' : `Оплатить`}
                </button>
            </div>
        </main>
    );
}

