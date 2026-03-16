"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {getAuthSessionToken} from "@/app/lib/authSession";

type GetRedirectPath = () => string | null;

export function useSessionReady():void {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = getAuthSessionToken();
    if (!existing) {
      router.replace("/authview");
      return;
    }
  }, [router]);

};
