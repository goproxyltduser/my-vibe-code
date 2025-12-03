// src/app/checkout/page.js
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.js'; 
import Link from 'next/link';

// Обертка Suspense нужна для корректной работы useSearchParams в Next.js
export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>Загрузка...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // 1. Данные заказа из URL
    const productName = searchParams.get('name') || 'Прокси';
    const productId = searchParams.get('id');
    const priceCents = parseInt(searchParams.get('price') || '0');
    const quantity = searchParams.get('qty');
    const period = searchParams.get('period');
    const country = searchParams.get('country');
    const isIPv6 = productName.toLowerCase().includes('ipv6');

    // 2. Состояния
    const [email, setEmail] = useState('');
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('gateway'); // 'gateway' или 'balance'

    // 3. Загрузка данных пользователя
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setEmail(user.email); // Автозаполнение Email
                
                // Проверяем баланс
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', user.id)
                    .single();
                if (profile) setBalance(profile.balance);
            }
            setLoading(false);
        };
        init();
    }, []);

    // 4. Обработка оплаты
    const handlePay = async () => {
        if (!email.includes('@')) {
            alert('Введите корректный Email');
            return;
        }
        
        setProcessing(true);
        
        // Определяем, куда слать запрос
        // Если метод 'balance' - используем API покупки, иначе - API чекаута (который создаст юзера)
        const endpoint = paymentMethod === 'balance' ? '/api/purchase' : '/api/checkout';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Если юзер есть - шлем ID, если нет - шлем email (API само создаст юзера)
                    userId: user?.id, 
                    email: email, 
                    
                    product: { name: productName, id: productId },
                    quantity, period, country, amountCents: priceCents
                })
            });

            const data = await res.json();

            if (paymentMethod === 'balance') {
                if (data.success) {
                    alert('Оплата прошла успешно!');
                    router.push('/profile');
                } else {
                    alert('Ошибка: ' + data.error);
                }
            } else {
                // Шлюз
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
                
                {/* Шапка */}
                <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                    <h1 className="text-2xl font-black uppercase">Оформление заказа</h1>
                    <Link href="/" className="text-sm text-gray-400 hover:text-[#E85D04]">✕ Отмена</Link>
                </div>

                {/* Информация о заказе */}
                <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Товар:</span>
                        <span className="font-bold">{productName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Параметры:</span>
                        <span>{quantity} шт. / {country} / {period} мес.</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 text-lg">
                        <span className="font-bold">К оплате:</span>
                        <span className="font-black text-[#E85D04]">${(priceCents / 100).toFixed(2)}</span>
                    </div>
                </div>

                {/* Поле Email */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Ваш Email</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!!user} // Если вошел - нельзя менять (чтобы не купил на чужой)
                        placeholder="mail@example.com" 
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-[#E85D04] outline-none transition"
                    />
                    {!user && <p className="text-xs text-gray-400 mt-2 ml-1">Мы создадим аккаунт автоматически и отправим доступы на эту почту.</p>}
                </div>

                {/* Выбор метода оплаты */}
                <div className="mb-8 space-y-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Способ оплаты</label>
                    
                    {/* Кнопка: Платежная система */}
                    <button 
                        onClick={() => setPaymentMethod('gateway')}
                        className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition ${paymentMethod === 'gateway' ? 'border-[#E85D04] bg-orange-50/50' : 'border-gray-100 hover:border-gray-300'}`}
                    >
                        <span className="font-bold">Карта / Криптовалюта</span>
                        {paymentMethod === 'gateway' && <span className="text-[#E85D04]">✔</span>}
                    </button>

                    {/* Кнопка: Баланс (Активна только если денег хватает) */}
                    <button 
                        onClick={() => balance >= priceCents && setPaymentMethod('balance')}
                        disabled={balance < priceCents}
                        className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition ${
                            balance < priceCents 
                            ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' 
                            : paymentMethod === 'balance' ? 'border-[#E85D04] bg-orange-50/50' : 'border-gray-100 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-left">
                            <span className="font-bold block">Списать с баланса</span>
                            <span className="text-xs text-gray-500">Доступно: ${(balance / 100).toFixed(2)}</span>
                        </div>
                        {paymentMethod === 'balance' && <span className="text-[#E85D04]">✔</span>}
                    </button>
                </div>

                {/* Кнопка Оплатить */}
                <button 
                    onClick={handlePay}
                    disabled={processing}
                    className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg text-lg"
                >
                    {processing ? 'Обработка...' : `Оплатить $${(priceCents / 100).toFixed(2)}`}
                </button>

            </div>
        </main>
    );
}

