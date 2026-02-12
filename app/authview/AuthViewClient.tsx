"use client";

import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/button";
import { useEffect, useState } from "react";
import {usePathname, useRouter} from "next/navigation";
import {VSModalPaged} from  "@/app/lib/authAlerts";
import {clearAuthSessionToken, setAuthSessionProfile, setAuthSessionToken} from "@/app/lib/authSession";
import { getDevSessionToken, setDevSessionToken } from "@/app/lib/devSession";

export default function AuthViewClient() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    let [devsessiontoken] = useState("");
    const pathname = usePathname();
    useEffect(() => {
        const t = getDevSessionToken();
        if (!t) {
            router.replace("/");
            return;
        }
    }, [router]);

    useEffect(() => {
        if (pathname !== "/authview") return;
        clearAuthSessionToken();
    }, [pathname]);
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.trim();

        if (!normalizedEmail || !normalizedPassword) {
            setSubmitting(false);
            void VSModalPaged({
                title: "Missing credentials",
                messages: ["Please enter your email and password."],
                tone: "error",
            });
            return;
        }

        try {
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: normalizedPassword,
                }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as
                    | { error?: string }
                    | null;
                void VSModalPaged({
                    title: "Access denied",
                    messages:
                        [data?.error ??
                        "No account was found with these credentials."],
                    tone: "error",
                });
                setSubmitting(false);
                return;
            }

            const token = crypto.randomUUID();
            setAuthSessionToken(token);
            setAuthSessionProfile({ email: normalizedEmail });
            setDevSessionToken(token);
            router.replace("/restaurantcardspage");
        } catch (error) {
            console.error("[AuthView] Failed to verify credentials:", error);
            void VSModalPaged({
                title: "Unexpected error",
                messages: ["Unable to verify credentials right now."],
                tone: "error",
            });
            setSubmitting(false);
        }
    };
    devsessiontoken = getDevSessionToken();
    if (!devsessiontoken) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <p className="text-sm uppercase tracking-[0.2em]">Loading...</p>
            </div>
        );
    }

    return (
        <AuthShell title="Sign In" subtitle="Welcome back">
            <form
                onSubmit={handleSubmit}
                className={[
                    "w-full space-y-6",
                    "rounded-3xl",
                    "mt-16",
                    "border-amber-300 border-8",
                    "bg-yellow-100",
                    "p-6 sm:p-8",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                ].join(" ")}
            >
                <div className={[
                    "space-y-6",
                    "rounded-3xl",
                    "border-amber-300 border-8",
                    "bg-white",
                    "p-6 sm:p-8",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                ].join(" ")}>
                    <label className="text-lg font-semibold text-orange-600">
                        Email Address
                        <input
                            type="email"
                            placeholder=""
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#2563eb]/40 bg-white/30 px-4 py-4 text-center text-xl text-[#2563eb] shadow-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                        />
                    </label>

                    <label className="text-lg font-semibold text-orange-600">
                        Password
                        <input
                            type="password"
                            placeholder=""
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#2563eb]/40 bg-white/30 px-4 py-4 text-center text-xl text-[#2563eb] shadow-sm focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                        />
                    </label>

                    <div className="mt-10 flex w-full items-center justify-center">
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex w-full items-center justify-center rounded-full text-xs font-semibold uppercase tracking-[0.2em] text-white transition sm:max-w-xs"
                        >
                            {submitting ? "Authenticating..." : "Continue to your VS"}
                        </Button>
                    </div>
                </div>
            </form>

            <div
                className={[
                    "w-full space-y-6",
                    "rounded-3xl",
                    "border-amber-300 border-8",
                    "bg-yellow-100",
                    "p-6 sm:p-8",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                ].join(" ")}
            >
                <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center">
                    <Button
                        type="button"
                        onClick={() => router.push("/signupview")}
                        className="inline-flex w-full items-center justify-center rounded-full text-xs font-semibold uppercase tracking-[0.2em] text-white transition sm:flex-1"
                    >
                        Create an account
                    </Button>

                    <Button
                        type="button"
                        onClick={() => router.push("/forgetpasswordview")}
                        className="inline-flex w-full items-center justify-center rounded-full text-xs font-semibold uppercase tracking-[0.2em] text-white transition sm:flex-1"
                    >
                        Forgot Password
                    </Button>
                </div>
            </div>
        </AuthShell>
    );
}