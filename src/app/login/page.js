// src/app/login/page.js
"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase.js'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false); 
    const [loading, setLoading] = useState(false);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter(); 

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                // --- РЕГИСТРАЦИЯ ---
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                
                alert('Регистрация успешна! Входим...');
                // Авто-вход
                await supabase.auth.signInWithPassword({ email, password });
                window.location.href = '/profile';
            } else {
                // --- ВХОД ---
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                
                // ЖЕСТКИЙ ПЕРЕХОД (Гарантирует обновление сессии)
                window.location.href = '/profile';
            }
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <main className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
            
            <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100">
                
                {/* ЗАГОЛОВОК (GOPROXY) */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block text-3xl font-black tracking-tighter uppercase text-gray-900 hover:opacity-80 transition mb-2">
                        <span className="text-[#E85D04]">GO</span>PROXY
                    </Link>
                    <h1 className="text-xl font-bold text-gray-500 uppercase tracking-wide">
                        {isSignUp ? 'Новый аккаунт' : 'Вход в кабинет'}
                    </h1>
                </div>

                {/* ФОРМА */}
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">Email</label>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:bg-white focus:border-[#E85D04] focus:ring-1 focus:ring-[#E85D04] outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">Пароль</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:bg-white focus:border-[#E85D04] focus:ring-1 focus:ring-[#E85D04] outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#cc5200] transition-all shadow-lg shadow-orange-500/20 active:scale-95 mt-4"
                    >
                        {loading ? 'Обработка...' : (isSignUp ? 'Зарегистрироваться' : 'Войти')}
                    </button>
                </form>

                {/* ПЕРЕКЛЮЧАТЕЛЬ */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-sm">
                        {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'} {' '}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-[#E85D04] font-bold hover:underline focus:outline-none"
                        >
                            {isSignUp ? 'Войти' : 'Создать'}
                        </button>
                    </p>
                    
                    <div className="mt-6">
                        <Link href="/" className="text-xs font-bold text-gray-400 hover:text-gray-600 transition uppercase tracking-wider">
                            ← На главную
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}

