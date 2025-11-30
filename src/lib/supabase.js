// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Добавляем проверку для отладки
if (!supabaseUrl || !supabaseAnonKey) {
  // Выведите эту ошибку в консоль, чтобы убедиться, что вы видите ее в браузере.
  console.error("КЛЮЧИ SUPABASE ОТСУТСТВУЮТ! Проверьте файл .env.local.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);