/** @type {import('tailwindcss').Config} */
module.exports = {
   content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // Добавь вот эту строку, чтобы наверняка:
    "src/**/*.{js,ts,jsx,tsx,mdx}", 
  ],



  theme: {
    extend: {
      colors: {
        primary: '#E85D04',
        secondary: '#1E293B',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        success: '#16A34A',
        text: '#0F172A',
      },
      fontFamily: {
        sans: ['TildaSans', 'Arial', 'sans-serif'],
        display: ['TildaSans', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

