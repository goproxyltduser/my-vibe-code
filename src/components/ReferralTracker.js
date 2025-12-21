// src/components/ReferralTracker.js
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function TrackerLogic() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refId = searchParams.get("ref");
    if (refId) {
      // Сохраняем ID партнера в localStorage
      localStorage.setItem("referral_id", refId);
      // Опционально: можно вывести в консоль для проверки
      // console.log("Реферал закреплен:", refId);
    }
  }, [searchParams]);

  return null;
}

export default function ReferralTracker() {
  return (
    // Suspense обязателен при использовании useSearchParams в Layout
    <Suspense fallback={null}>
      <TrackerLogic />
    </Suspense>
  );
}

