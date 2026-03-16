"use client";

import {useEffect} from "react";
import { useAuthGate } from "@/app/gate/auth";
import {usePathname, useRouter} from "next/navigation";
import {
    clearDevSessionToken,
    getDevSessionToken,
    setDevSessionToken,
} from "@/app/lib/devSession";
import { clearAuthSessionProfile, clearAuthSessionToken } from "@/app/lib/authSession";
import Script from "next/script";

export default function DevAuthGate() {
    const {
        googleAuthed,
        googleUserId,
        googleError,
        pinInput,
        setPinInput,
        pinVerified,
        pinError,
        pinLocked,
        verifyPin,
        resetGate
    } = useAuthGate();


    const pathname = usePathname();
    const router = useRouter();
    useEffect(() => {
        if (pathname !== "/") return;
        resetGate();
        clearDevSessionToken();
        clearAuthSessionToken();
        clearAuthSessionProfile();
    }, [pathname, resetGate]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const g = (window as any).google;
        if (!g?.accounts?.id) return; // script ainda não carregou

        g.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        });

        g.accounts.id.renderButton(
            document.getElementById("google-signin"),
            { theme: "outline", size: "large", width: 320 }
        );
    }, []);

    useEffect(() => {
        if (!googleAuthed || !pinVerified) return;
        const existing = getDevSessionToken();
        if (existing) {
            return
        }else{
            const token = crypto.randomUUID();
            setDevSessionToken(token);
            const existing2 = getDevSessionToken();
        }
    }, [googleAuthed, pinVerified, router]);

    useEffect(() => {
        const existing = getDevSessionToken();
        if (existing && pinVerified) {
            router.replace("/authview");
        }
    }, [googleAuthed, pinVerified, router]);
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 text-zinc-950 dark:bg-black dark:text-zinc-50">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-zinc-900">
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        /gate
                    </p>
                    <h1 className="text-2xl font-semibold">Sign in with Google and enter your PIN</h1>
                </div>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium">Google sign-in</p>
                        <div id="google-signin" className="mt-2 min-h-[44px]" />
                        {googleError ? <p className="mt-2 text-xs text-rose-500">{googleError}</p> : null}
                        {googleAuthed ? (
                            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                                Signed in as {googleUserId}
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">PIN password</label>
                        <input
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="Enter your PIN"
                        />
                        {pinError ? <p className="text-xs text-rose-500">{pinError}</p> : null}
                        {pinVerified ? <p className="text-xs text-emerald-500">PIN verified.</p> : null}

                        <button
                            type="button"
                            onClick={verifyPin}
                            disabled={!pinInput.trim() || pinLocked}
                            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900"
                        >
                            Verify PIN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}