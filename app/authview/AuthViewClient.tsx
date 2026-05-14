"use client";

import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/button";
import { useEffect, useState } from "react";
import {usePathname, useRouter} from "next/navigation";
import {VSModalPaged} from  "@/app/lib/authAlerts";
import {clearAuthSessionToken, setAuthSessionProfile, setAuthSessionToken} from "@/app/lib/authSession";
import { setDevSessionToken } from "@/app/lib/devSession";



export default function AuthViewClient() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const pathname = usePathname();
    const AUTH_REQUEST_TIMEOUT_MS = 15_000;

    useEffect(() => {
        if (pathname !== "/authview") return;
        clearAuthSessionToken();
    }, [pathname]);


    const verifyCredentials = async (normalizedEmail: string, normalizedPassword: string) => {
        const endpoints = ["/api/auth/verify", "/api/authview"];
        let timeoutId: number | undefined;
        let lastError: unknown = null;

        for (const endpoint of endpoints) {
            const controller = new AbortController();
            try {
                timeoutId = window.setTimeout(() => {
                    controller.abort("auth-request-timeout");
                }, AUTH_REQUEST_TIMEOUT_MS);

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        email: normalizedEmail,
                        password: normalizedPassword,
                    }),
                });

                if (response.ok) return;

                const data = (await response.json().catch(() => null)) as
                    | { error?: string }
                    | null;

                if (response.status >= 400 && response.status < 500) {
                    throw new Error(data?.error ?? "No account was found with these credentials.");
                }

                lastError = new Error(data?.error ?? "Unable to verify credentials right now.");
            } catch (error) {
                lastError = error;
            } finally {
                if (timeoutId !== undefined) {
                    window.clearTimeout(timeoutId);
                    timeoutId = undefined;
                }
            }
        }

        throw lastError ?? new Error("Unable to verify credentials right now.");
    };

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
            await verifyCredentials(normalizedEmail, normalizedPassword);

            const token = crypto.randomUUID();
            setAuthSessionToken(token);
            setAuthSessionProfile({ email: normalizedEmail });
            setDevSessionToken(token);
            router.replace("/restaurantcardspage");
        } catch (error) {
            console.error("[AuthView] Failed to verify credentials:", error);
            const timedOut =
                error instanceof DOMException && error.name === "AbortError";
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : "Unable to verify credentials right now.";
            void VSModalPaged({
                title: timedOut ? "Request timeout" : "Access denied",
                messages: [
                    timedOut
                        ? "Authentication took too long. Please try again."
                        : message,
                ],
                tone: "error",
            });
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AuthShell
            title="Sign In"
            subtitle="Welcome back"
        >
            <form
                onSubmit={handleSubmit}
                className={[
                    "w-full space-y-6",
                    "rounded-3xl",
                    "mt-16",
                    "border-amber-300 border-8",
                    "fe-form-material",
                    "fe-glass-panel",
                    "px-6 pb-8 pt-10 sm:px-8 sm:pb-8 sm:pt-12",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                ].join(" ")}
            >
                <div className={[
                    "space-y-6",
                    "rounded-3xl",
                    "border-amber-300 border-8",
                    "bg-white/55",
                    "fe-glass-panel",
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
                    "bg-white",
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
