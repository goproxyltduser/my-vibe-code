// src/app/partners/page.js
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Данные для условий (чтобы не загромождать верстку)
const CONDITIONS = [
  {
    title: "РАЗРЕШЕНО",
    type: "allowed",
    items: [
      "Размещать партнерские ссылки на своих ресурсах (На собственных сайтах, Telegram каналах и чатах, YouTube и другие)",
      "Делать обзоры, сравнения и личные кейсы на форумах, в социальных сетях и мессенджерах (при соблюдениях правил площадок)",
      "Использовать платную рекламу (таргетинг, реклама в Telegram каналах и тд)"
    ]
  },
  {
    title: "ЗАПРЕЩЕНО",
    type: "prohibited",
    items: [
      "Использовать спам (массовые рассылки, спам комментарии, автопостинг на форумах и чужих чатах)",
      "Введение пользователей в заблуждение (искажение характеристик прокси, 0% шанс бана и тд)",
      "Использование чужих брендов и логотипов без разрешения",
      "Использовать запрещенные рекламные методы (накрутки, мотив трафик и тд)",
      'Использовать "теневую рекламу" - для рекомендации в серых и темных темах (читы, взлома, мошенничество и др., что запрещено законом РФ)',
      "Распространение вредоносного ПО"
    ]
  },
  {
    title: "Дополнительные условия",
    type: "simple",
    items: [
      "Администрация вправе запросить информацию об источниках трафика.",
      "В случае выявления фрода: партнёрский аккаунт блокируется, вознаграждение аннулируется, выплаты не производятся.",
      "Один пользователь = один партнёр. Саморефералы запрещены.",
      "Запрещено регистрировать аккаунты с целью получения партнёрских выплат."
    ]
  },
  {
    title: "Ответственность партнёра",
    type: "simple",
    items: [
      "Партнёр самостоятельно несёт ответственность за соблюдение законодательства своей страны.",
      "Сервис не несёт ответственности за действия партнёра на сторонних платформах.",
      "Любые претензии со стороны третьих лиц, возникшие из-за действий партнёра, являются ответственностью партнёра."
    ]
  },
  {
    title: "Изменения условий",
    type: "simple",
    items: [
      "Администрация сервиса вправе вносить изменения в условия партнёрской программы в любое время.",
      "Продолжение участия в программе после изменений означает согласие с обновлёнными условиями."
    ]
  }
];

export default function PartnersLanding() {
    const [session, setSession] = useState(null);
    const [openIndex, setOpenIndex] = useState(0); // По умолчанию открыт первый пункт (0)
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
        };
        checkSession();
    }, []);

    const handleJoin = () => {
        if (session) {
            router.push('/profile/partners');
        } else {
            router.push('/login');
        }
    };

    // Функция переключения аккордеона
    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? -1 : index);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#1E293B]">
            {/* ШАПКА */}
            <header className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <Link href="/" className="text-2xl font-black uppercase tracking-tighter">
                    <span className="text-[#E85D04]">GO</span>PROXY
                </Link>
                <Link href="/" className="text-sm font-bold text-gray-400 hover:text-black transition">
                    ✕ Закрыть
                </Link>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16">
                
                {/* ЗАГОЛОВОК */}
                <div className="text-center mb-16">
                    <span className="bg-orange-100 text-[#E85D04] px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">
                        Партнерская программа
                    </span>
                    <h1 className="text-4xl md:text-7xl font-black mt-6 mb-6 uppercase leading-none tracking-tight">
                        Зарабатывайте <span className="text-[#E85D04]">20%</span> <br/> с каждой продажи
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                        Рекомендуйте лучший прокси-сервис и получайте пассивный доход пожизненно.
                    </p>
                </div>

                {/* БЛОКИ С ЦИФРАМИ (3 КОЛОНКИ) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                    {/* Блок 1 */}
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-lg transition duration-300">
                        <div className="text-6xl font-black text-[#E85D04] mb-4">20%</div>
                        <h3 className="text-xl font-bold mb-2 uppercase">С первой покупки</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Вы получаете повышенную комиссию за первый заказ каждого клиента.
                        </p>
                    </div>
                    
                    {/* Блок 2 */}
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-lg transition duration-300">
                        <div className="text-6xl font-black text-black mb-4">10%</div>
                        <h3 className="text-xl font-bold mb-2 uppercase">Пожизненно</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Со всех продлений и повторных покупок мы платим вам вечно.
                        </p>
                    </div>

                    {/* Блок 3 (Индивидуальный) */}
                    <div className="bg-black text-white p-8 rounded-3xl border border-black hover:scale-[1.02] transition duration-300 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2 uppercase">
                                Индивидуальные комиссии
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Для крупных партнеров с большим трафиком.
                            </p>
                        </div>
                        <Link 
                            href="https://t.me/maxim_hayd" 
                            target="_blank"
                            className="inline-flex items-center justify-center w-full px-6 py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition"
                        >
                            Обсудить
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </Link>
                    </div>
                </div>

                {/* УСЛОВИЯ (АККОРДЕОН) */}
                <div className="mb-24">
                    <h2 className="text-3xl font-black mb-10 text-center uppercase">Условия программы</h2>
                    
                    <div className="space-y-4">
                        {CONDITIONS.map((section, idx) => {
                            const isOpen = openIndex === idx;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`border rounded-3xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-gray-300 bg-white shadow-xl' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <button 
                                        onClick={() => toggleAccordion(idx)}
                                        className="w-full flex items-center justify-between p-6 md:p-8 text-left"
                                    >
                                        <span className={`text-xl md:text-3xl font-black uppercase ${isOpen ? 'text-[#E85D04]' : 'text-gray-800'}`}>
                                            {section.title}
                                        </span>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-[#E85D04] rotate-180' : 'bg-gray-200'}`}>
                                            <svg className={`w-6 h-6 ${isOpen ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </button>
                                    
                                    {/* Выпадающий контент */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="p-6 md:p-8 pt-0 border-t border-transparent">
                                            <ul className="space-y-4">
                                                {section.items.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-4 text-lg text-gray-600 font-medium">
                                                        {/* ИКОНКИ В ЗАВИСИМОСТИ ОТ ТИПА */}
                                                        {section.type === 'allowed' && (
                                                            <div className="mt-1 min-w-[24px] w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        )}
                                                        {section.type === 'prohibited' && (
                                                            <div className="mt-1 min-w-[24px] w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                            </div>
                                                        )}
                                                        {section.type === 'simple' && (
                                                            <div className="mt-2 min-w-[8px] w-2 h-2 rounded-full bg-gray-300 shrink-0"></div>
                                                        )}
                                                        
                                                        <span className="leading-relaxed">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* КАК ЭТО РАБОТАЕТ (Оставил без изменений, только чуть освежил отступы) */}
                <div className="mb-24">
                    <h2 className="text-3xl font-black mb-12 text-center uppercase">Как начать?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-2xl shadow-lg mb-6">1</div>
                            <h4 className="text-xl font-bold mb-2">Регистрация</h4>
                            <p className="text-gray-500">Создайте аккаунт и перейдите в раздел «Партнерам».</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-2xl shadow-lg mb-6">2</div>
                            <h4 className="text-xl font-bold mb-2">Ссылка</h4>
                            <p className="text-gray-500">Получите уникальную ссылку и разместите её.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#E85D04] text-white flex items-center justify-center font-bold text-2xl shadow-lg mb-6">3</div>
                            <h4 className="text-xl font-bold mb-2">Доход</h4>
                            <p className="text-gray-500">Получайте % с каждой покупки на ваш баланс.</p>
                        </div>
                    </div>
                </div>

                {/* ПРИЗЫВ К ДЕЙСТВИЮ */}
                <div className="text-center bg-black text-white rounded-[2.5rem] p-10 md:p-20 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#E85D04] opacity-20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black uppercase mb-8">Создай свой <br/> пассивный доход</h2>
                        <button
                            onClick={handleJoin}
                            className="px-12 py-5 bg-[#E85D04] text-white font-black rounded-2xl text-xl hover:bg-white hover:text-[#E85D04] transition-all shadow-xl transform hover:-translate-y-1 duration-200"
                        >
                            Стать партнером
                        </button>
                        <p className="mt-6 text-gray-500 text-sm font-medium">Регистрация займет 30 секунд</p>
                    </div>
                </div>
            </main>
        </div>
    );
}

