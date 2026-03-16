"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button";
import { useRouter } from "next/navigation";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { signupSchema, type SignupValues } from "./schema";
import { VSModalPaged} from "@/app/lib/authAlerts";

export default function SignupForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            dataPolicyAccepted: false,
        },
        mode: "onTouched",
    });

    const handleInvalid = () => {
        const errors = form.formState.errors;
        const errorMessages = [
            errors.name?.message,
            errors.email?.message,
            errors.password?.message,
            errors.confirmPassword?.message,
            errors.dataPolicyAccepted?.message,
        ]
            .filter(Boolean)
            .map((message) => String(message));
        const uniqueMessages = Array.from(new Set(errorMessages));

        if (uniqueMessages.length > 1) {
            void VSModalPaged({
                title: "Check your details",
                messages: uniqueMessages,
                tone: "error",
            });
            return;
        }

        void VSModalPaged({
            title: "Check your details",
            messages:
                [uniqueMessages[0] ??
                "Please correct the highlighted fields and try again."],
            tone: "error",
        });
    };

    const handleSubmit = (values: SignupValues) => {
        startTransition(async () => {
            const parsed = signupSchema.safeParse(values);
            if (!parsed.success) {
                const messages = parsed.error.issues.map((issue) => issue.message);
                const uniqueMessages = Array.from(new Set(messages));

                if (uniqueMessages.length > 1) {
                    void VSModalPaged({
                        title: "Check your details",
                        messages: uniqueMessages,
                        tone: "error",
                    });
                    return;
                }
                return;
            }

            try {
                const response = await fetch("/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: parsed.data.name.trim(),
                        email: parsed.data.email.trim().toLowerCase(),
                        password: parsed.data.password,
                    }),
                });

                if (!response.ok) {
                    const data = (await response.json().catch(() => null)) as
                        | { error?: string }
                        | null;
                    void VSModalPaged({
                        title: "Signup failed",
                        messages:
                            [data?.error ??
                            "Unable to create your account right now."],
                        tone: "error",
                    });
                    return;
                }

                await VSModalPaged({
                    title: "Account created",
                    messages: [`Welcome, ${parsed.data.name}. Your account has been successfully created.`],
                    tone: "success",
                });
                   form.reset();
                router.replace("/authview");

            } catch (error) {
                console.error("[Signup] Failed to create account", error);
                void VSModalPaged({
                    title: "Signup failed",
                    messages: ["Unable to create your account right now."],
                    tone: "error",
                });
            }
        });
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
                className="space-y-5 fe-glass-panel rounded-3xl border border-white/40 p-5 sm:p-6"
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-lg font-semibold text-orange-500">
                                Full name
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Your full name"
                                    {...field}
                                    className={`text-lg text-black placeholder:text-gray-400 ${
                                        form.formState.errors.name
                                            ? "border-red-500/40 ring-2 ring-red-500/30"
                                            : ""
                                    }`}
                                />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-lg font-semibold text-orange-500">
                                Email address
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Your e-mail"
                                    type="email"
                                    {...field}
                                    className={`text-lg text-black placeholder:text-gray-400 ${
                                        form.formState.errors.email
                                            ? "border-red-500/40 ring-2 ring-red-500/30"
                                            : ""
                                    }`}
                                />
                            </FormControl>

                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-lg font-semibold text-orange-500">
                                Password
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Create a password"
                                    type="password"
                                    {...field}
                                    className={`text-lg text-black placeholder:text-gray-400 ${
                                        form.formState.errors.password
                                            ? "border-red-500/40 ring-2 ring-red-500/30"
                                            : ""
                                    }`}
                                />
                            </FormControl>

                            <FormDescription>
                                Use at least 8 characters with letters, numbers, and a
                                symbol.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-lg font-semibold text-orange-500">
                                Confirm password
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Re-enter your password"
                                    type="password"
                                    {...field}
                                    className={`text-lg text-black placeholder:text-gray-400 ${
                                        form.formState.errors.confirmPassword
                                            ? "border-red-500/40 ring-2 ring-red-500/30"
                                            : ""
                                    }`}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dataPolicyAccepted"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <label className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/70 p-4 text-sm text-orange-700">
                                    <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                                        checked={field.value}
                                        onChange={(event) =>
                                            field.onChange(event.target.checked)
                                        }
                                    />
                                    <span>
                                        I agree to the data use policy and advertising
                                        updates.
                                    </span>
                                </label>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "Creating your account..." : "Create your account"}
                </Button>
            </form>
        </Form>
    );
}
