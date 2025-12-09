// src/app/success/page.js
"use client";

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sentRef = useRef(false); // Защита от дублей при перезагрузке

  useEffect(() => {
    // Если уже отправили - не отправляем снова
    if (sentRef.current) return;

    // Получаем данные из URL
    const amount = searchParams.get('amount');
    const productName = searchParams.get('product');
    const orderId = searchParams.get('order_id') || Math.floor(Math.random() * 100000).toString();
    const type = searchParams.get('type') || 'purchase'; // 'proxy' или 'balance'

    if (amount && productName) {
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          "ecommerce": {
            "purchase": {
              "actionField": {
                "id": orderId,
                "revenue": parseFloat(amount)
              },
              "products": [
                {
                  "id": type === 'balance' ? 'balance_topup' : orderId,
                  "name": productName, // Например: "IPv4 USA" или "Пополнение баланса"
                  "price": parseFloat(amount),
                  "quantity": 1,
                  "category": type === 'balance' ? 'Balance' : 'Proxy'
                }
              ]
            }
          }
        });
        console.log(`Метрика: Покупка ${productName} на сумму ${amount} отправлена.`);
        sentRef.current = true;
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center justify-center p-4">
      <div className="bg-surface p-8 rounded-2xl shadow-lg text-center max-w-md w-full border border-gray-700">
        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Оплата прошла успешно!</h1>
        <p className="text-gray-400 mb-6">
          Спасибо за покупку. Ваши услуги уже доступны в личном кабинете.
        </p>

        <div className="space-y-3">
          <Link 
            href="/profile" 
            className="block w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Перейти в кабинет
          </Link>
          <Link 
            href="/" 
            className="block w-full bg-secondary hover:bg-slate-700 text-text font-semibold py-3 px-6 rounded-xl transition-all"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

