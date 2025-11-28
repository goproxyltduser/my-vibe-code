// src/app/page.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
// ... (после const [loading, setLoading] = useState(false); )

  // НОВОЕ СОСТОЯНИЕ для хранения информации о текущей сессии
  const [session, setSession] = useState(null); 

  // БЛОК, КОТОРЫЙ ПРОВЕРЯЕТ СТАТУС ВХОДА (ПРИ ЗАГРУЗКЕ И ПРИ ИЗМЕНЕНИИ)
  useEffect(() => {
    // 1. Проверяем текущую сессию при первой загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Настраиваем слушателя изменений (вход, выход, обновление токена)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    // Обязательная очистка при выходе со страницы
    return () => subscription.unsubscribe();
  }, []);
  
  // ... (далее идут функции handleSignUp и handleSignIn)
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    setLoading(false);

    if (error) {
      // ИСПОЛЬЗУЕМ ОБЫЧНЫЕ КАВЫЧКИ И КОНКАТЕНАЦИЮ (знак +)
      // Это предотвращает синтаксические ошибки, которые были ранее.
      alert('Ошибка регистрации: ' + error.message);
      console.error(error);
    } else {
      alert('Регистрация успешна! Проверьте список пользователей в Supabase.');
    }
  };
// ... (после const [loading, setLoading] = useState(false); )

  // Состояния для формы ВХОДА
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    
    setLoading(false);

    if (error) {
      alert('Ошибка входа: Неверный Email или Пароль (' + error.message + ')');
      console.error(error);
    } else {
      alert('Вход успешен! Вы авторизованы.');
      // Здесь мы будем обновлять интерфейс, чтобы показать, что пользователь вошел
    }
  };

// ... (прокрутите до return)
return (
    <main style={{ padding: 40 }}>
      {/* УСЛОВИЕ: Если есть активная сессия (session), показываем приветствие. 
        Иначе, показываем формы.
      */}
      {session ? (
        // =========================================================
        // ЕСЛИ ПОЛЬЗОВАТЕЛЬ ВОШЕЛ
        // =========================================================
        <div>
          <h1>👋 Добро пожаловать, {session.user.email}!</h1>
          <p>Вы успешно авторизованы. Теперь вы можете видеть платный контент.</p>
          
          <button onClick={async () => {
            await supabase.auth.signOut();
          }} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: 'red', color: 'white', border: 'none', cursor: 'pointer' }}>
            Выйти
          </button>

        </div>
      ) : (
        // =========================================================
        // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НЕ ВОШЕЛ (показываем формы)
        // =========================================================
        <>
          {/* ФОРМА 1: РЕГИСТРАЦИЯ */}
          <h1>Регистрация нового пользователя</h1>
          <form onSubmit={handleSignUp}>
            <div>
              <label>Email:</label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div>
              <label>Пароль:</label>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
              {loading ? 'Загрузка...' : 'Зарегистрироваться'}
            </button>
          </form>

          <hr style={{ margin: '40px 0' }} /> 

          {/* ФОРМА 2: ВХОД */}
          <h1>Вход</h1>
          <form onSubmit={handleSignIn}>
            <div>
              <label>Email:</label>
              <input
                type="email"
                placeholder="Email для входа"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div>
              <label>Пароль:</label>
              <input
                type="password"
                placeholder="Пароль для входа"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}