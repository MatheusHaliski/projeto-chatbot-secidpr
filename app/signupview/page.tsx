"use client";
import Image from "next/image";
import AuthShell from "../components/AuthShell";
import SignupForm from "./SignupForm";

export default function SignupViewPage() {
    return (
        <AuthShell
            title="Start your Velion Social journey"
            subtitle="Create your account in minutes"
        >
            <div
                className={[
                    "space-y-4",
                    "rounded-3xl",
                    "border-8 border-orange-500",
                    "bg-white",
                    "p-4 sm:p-6",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                ].join(" ")}
            >
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-orange-600">
                    Start your Dine Explorer journey
                </p>
                 <Image
                    src="/welcome-newcomers.png"
                    alt="Welcome image for newcomers"
                    width={1024}
                    height={1024}
                    className="h-auto w-full rounded-2xl"
                    priority
                />
            </div>

            <div
                className={[
                    "space-y-4",
                    "rounded-3xl",
                    "border-amber-300 border-8", // ✅ requested
                    "bg-white",
                    "p-6 sm:p-8",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
    ].join(" ")}
            >
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-orange-600">
                    Start your Velion Social journey
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-orange-600">
                    Build your new account
                </h1>
                <SignupForm />
            </div>
        </AuthShell>
    );
}
