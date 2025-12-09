"use client";

import { useEffect, useRef, Suspense } from 'react'; // Добавил Suspense
import { useSearchParams, useRouter } from 'next/navigation';

// 1. Внутренний компонент с логикой (читает URL)
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;

    const amount = searchParams.get('amount');
    const type = searchParams.get('type'); 
    const productName = searchParams.get('product'); // Получаем имя, если передали

    if (amount) {
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          "ecommerce": {
            "purchase": {
              "actionField": {
                "id": Math.floor(Math.random() * 100000).toString(),
                "revenue": parseFloat(amount)
              },
              "products": [
                {
                  "id": type === 'balance' ? 'balance_topup' : 'proxy_buy',
                  "name": productName || (type === 'balance' ? 'Пополнение баланса' : 'Покупка прокси'),
                  "price": parseFloat(amount),
                  "quantity": 1
                }
              ]
            }
          }
        });
        sentRef.current = true;
      }
      // Через 5 секунд в профиль
      setTimeout(() => router.push('/profile'), 5000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text">
      <h1 className="text-3xl font-bold text-success mb-4">Оплата прошла успешно!</h1>
      <p>Сумма: ${searchParams.get('amount')}</p>
      <p className="text-gray-400 mt-4">Сейчас вы будете перенаправлены в кабинет...</p>
    </div>
  );
}

// 2. Основной компонент страницы (Обертка Suspense)
export default function SuccessPage() {
  return (
    // Suspense нужен, чтобы useSearchParams не ломал сборку
    <Suspense fallback={<div className="text-center p-10">Загрузка данных заказа...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

