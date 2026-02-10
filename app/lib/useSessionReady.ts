"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getServerSession } from "@/app/lib/clientSession";

export function useSessionReady(): void {
    const router = useRouter();

    useEffect(() => {
        void (async () => {
            const existing = await getServerSession();
            if (!existing) {
                router.replace("/authview");
            }
        })();
    }, [router]);
}
