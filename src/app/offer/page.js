import Link from 'next/link';

export default function OfferPage() {
    return (
        <main className="min-h-screen bg-white text-gray-900 font-sans p-6 md:p-20">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-[#E85D04] font-bold mb-10 hover:underline">
                    ← Вернуться на главную
                </Link>

                <h1 className="text-4xl md:text-5xl font-black mb-10 uppercase">Публичная оферта</h1>

                <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                    <p><strong>1. Предмет оферты</strong><br/>
                    Продажа доступа к прокси-серверам.</p>
                    
                    <p><strong>2. Порядок оплаты</strong><br/>
                    Оплата производится банковскими картами или криптовалютой через наш сайт.</p>

                    <p><strong>3. Возврат средств</strong><br/>
                    Мы гарантируем возврат средств в течение 48 часов, если услуга не была предоставлена качественно.</p>
                    
                    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 mt-10">
                        <p className="text-sm text-gray-500">Пожалуйста, вставьте сюда юридический текст вашей Оферты.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}

