/** @type {import('tailwindcss').Config} */
export default {
  // Указываем, где искать классы Tailwind
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Охватывает и pages, и components, и app
  ],
  theme: {
    extend: {
      // 1. ЦВЕТОВАЯ ПАЛИТРА (Темно-оранжевая тема)
      colors: {
        primary: '#E85D04', // Яркий оранжевый (кнопки, акценты)
        secondary: '#1E293B', // Темный (фон хедера, футера)
        background: '#F8FAFC', // Светлый фон страницы
        surface: '#FFFFFF', // Белый фон карточек
        success: '#16A34A', // Зеленый
        text: '#0F172A', // Основной текст (почти черный)
      },
      // 2. ШРИФТЫ (Как вы просили)
      fontFamily: {
        sans: ['TildaSans', 'Arial', 'sans-serif'],
        display: ['TildaSans', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

