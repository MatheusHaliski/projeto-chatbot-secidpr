"use client";

import AuthShell from "../components/AuthShell";
import { VSModalPaged } from "@/app/lib/authAlerts";
import { type FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDevSessionToken } from "@/app/lib/devSession";
import { clearSharedAccessToken, ensureSharedAccessToken } from "@/app/lib/accessTokenShare";
import { clearAuthSessionToken } from "@/app/lib/authSession";

const ff = "'Inter', 'Segoe UI', Arial, sans-serif";

export default function SignupViewPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const t = getDevSessionToken();
        if (!t) {
            router.replace("/devauthgate");
        }
        ensureSharedAccessToken();
    }, [router]);

    useEffect(() => {
        if (pathname !== "/forgetpasswordview") return;
        clearAuthSessionToken();
        clearSharedAccessToken();
    }, [pathname]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            void VSModalPaged({
                title: "Email required",
                messages: ["Please enter your email address to continue."],
                tone: "error",
            });
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch("/api/auth/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as
                    | { error?: string }
                    | null;
                void VSModalPaged({
                    title: "Reset failed",
                    messages: [
                        data?.error ??
                        "We could not send a reset link right now.",
                    ],
                    tone: "error",
                });
                setSubmitting(false);
                return;
            }

            void VSModalPaged({
                title: "Check your email",
                messages: [
                    "We sent a redefinition link to your inbox. Follow it to reset your password.",
                ],
                tone: "success",
            });
            setSubmitting(false);
        } catch (error) {
            console.error("[ForgetPassword] Failed to request reset:", error);
            void VSModalPaged({
                title: "Unexpected error",
                messages: ["Unable to send the reset email right now."],
                tone: "error",
            });
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            title="Password reset"
            subtitle="Send yourself a reset link"
            description="Enter your account email"
        >
            <div
                style={{
                    fontFamily: ff,
                    width: "100%",
                    overflow: "hidden",
                    borderRadius: 24,
                    border: "1px solid rgba(147, 197, 253, 0.45)",
                    boxShadow: "0 24px 60px rgba(30, 64, 175, 0.2)",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    minHeight: 420,
                }}
            >
                <div
                    className="hidden lg:flex"
                    style={{
                        width: "45%",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1.5rem",
                        padding: "2.25rem",
                        color: "#ffffff",
                        background: "linear-gradient(165deg, #1d4ed8 0%, #2563eb 45%, #38bdf8 100%)",
                    }}
                >
                    <div>
                        <div style={{ fontSize: "1.375rem", fontWeight: 700 }}>Fashion AI</div>
                        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", marginTop: "0.5rem" }}>
                            Secure account recovery with a quick reset link.
                        </p>
                    </div>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                        {["Account protection", "One-click reset", "Fast inbox delivery"].map((item) => (
                            <div
                                key={item}
                                style={{
                                    borderRadius: 12,
                                    backgroundColor: "rgba(255,255,255,0.16)",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    padding: "0.7rem 0.8rem",
                                    fontSize: "0.9rem",
                                }}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.76)", margin: 0 }}>
                        © 2026 Fashion AI
                    </p>
                </div>

                <div
                    style={{
                        flex: 1,
                        backgroundColor: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2rem",
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 420, display: "grid", gap: "1rem" }}>
                        <label style={{ display: "grid", gap: "0.5rem", color: "#1e3a8a", fontWeight: 600, fontSize: "0.95rem" }}>
                            Email address
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-base text-blue-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300/70"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: "100%",
                                border: "none",
                                borderRadius: 12,
                                padding: "0.8rem 1rem",
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                color: "#ffffff",
                                cursor: submitting ? "not-allowed" : "pointer",
                                opacity: submitting ? 0.7 : 1,
                                background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #38bdf8 100%)",
                            }}
                        >
                            {submitting ? "Sending..." : "Email the reset link"}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/authview")}
                            style={{
                                width: "100%",
                                borderRadius: 12,
                                border: "1px solid #bfdbfe",
                                padding: "0.75rem 1rem",
                                fontSize: "0.92rem",
                                fontWeight: 600,
                                color: "#1d4ed8",
                                backgroundColor: "#eff6ff",
                                cursor: "pointer",
                            }}
                        >
                            Return
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/signupview")}
                            style={{
                                width: "100%",
                                borderRadius: 12,
                                border: "1px solid #bfdbfe",
                                padding: "0.75rem 1rem",
                                fontSize: "0.92rem",
                                fontWeight: 600,
                                color: "#1d4ed8",
                                backgroundColor: "#ffffff",
                                cursor: "pointer",
                            }}
                        >
                            Create an account
                        </button>
                    </form>
                </div>
            </div>
        </AuthShell>
    );
}
