"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getServerSession } from "@/app/lib/clientSession";
import { RestaurantCardsInner } from "@/app/restaurantcardspage/RestaurantCardsInner";

export default function RestaurantCardsPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const existing = await getServerSession();
      if (!existing) {
        router.replace("/authview");
        return;
      }
      setSessionReady(true);
    })();
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