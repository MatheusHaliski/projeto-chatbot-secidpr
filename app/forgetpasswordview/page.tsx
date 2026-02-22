"use client";

import AuthShell from "../components/AuthShell";
import { Button } from "@/components/ui/button";
import { VSModalPaged } from "@/app/lib/authAlerts";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function SignupViewPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

            <div className="flex flex-col h-[600px] bg-white/45 fe-glass-panel border-8 rounded-2xl border-yellow-300 items-center">
                <form className="space-y-12 h-[100%] text-base fe-glass-panel border-8 rounded-2xl border-yellow-300 items-center" onSubmit={handleSubmit}>
                    <label className="block text-xl mt-10 font-semibold text-orange-600 leading-tight">
                        Email address
                        <input
                            type="email"
                            placeholder=""
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#0b2b45]/25 bg-white/30 px-4 py-3 text-lg text-[#1d4ed8] shadow-sm focus:border-[#facc15] focus:outline-none focus:ring-2 focus:ring-[#facc15]/40"
                        />
                    </label>

                    <div className="mt-10 flex w-full flex-col items-center gap-6">
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex w-full max-w-xs items-center justify-center scale-110 text-xs font-semibold uppercase tracking-[0.2em] text-white transition rounded-full"
                        >
                            {submitting ? "Sending..." : "Email the reset link"}
                        </Button>

                        <Button
                            type="button"
                            onClick={() => router.push("/authview")}
                            className="inline-flex w-full max-w-xs items-center justify-center scale-110 text-xs font-semibold uppercase tracking-[0.2em] text-white transition rounded-full"
                        >
                            Return
                        </Button>

                        <Button
                            type="button"
                            onClick={() => router.push("/signupview")}
                            className="inline-flex w-full max-w-xs items-center justify-center scale-110 text-xs font-semibold uppercase tracking-[0.2em] text-white transition rounded-full"
                        >
                            Create an account
                        </Button>
                    </div>

                </form>
            </div>
        </AuthShell>
    );
}
