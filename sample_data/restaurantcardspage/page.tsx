"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAuthSessionToken } from "@/app/lib/authSession";
import { RestaurantCardsInner } from "@/app/restaurantcardspage/RestaurantCardsInner";

export default function RestaurantCardsPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const existing = getAuthSessionToken();
    if (!existing) {
      router.replace("/authview");
      return;
    }
    setSessionReady(true);
  }, [router]);

  if (!sessionReady) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <p className="text-sm uppercase tracking-[0.2em]">Loading...</p>
        </div>
    );
  }

  return <RestaurantCardsInner />;
}