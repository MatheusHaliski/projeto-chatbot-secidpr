"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Form, FormControl, FormField, FormItem, FormMessage } from "../components/ui/form";
import { signupSchema, type SignupValues } from "./schema";
import { VSModalPaged } from "@/app/lib/authAlerts";
import { setAuthSessionProfile } from "@/app/lib/authSession";
import { resolveOAuthUserMessage, signInWithGoogle } from "@/app/auth";
import { firebaseAuthGate } from "@/app/gate/firebaseClient";
import {
    createUserWithEmailAndPassword,
    getAuth,
    updateProfile,
    type AuthError,
} from "firebase/auth";

const ff = "'Inter', 'Segoe UI', Arial, sans-serif";
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", backgroundColor: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb", outline: "none", color: "#111827", fontSize: "1rem", fontFamily: ff, boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem", fontFamily: ff };

const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
);


const signupErrorMessageByCode: Record<string, string> = {
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "A senha é muito fraca. Use ao menos 8 caracteres com letra, número e símbolo.",
    "auth/invalid-email": "Informe um e-mail válido.",
};

const resolveSignupErrorMessage = (error: unknown): string => {
    const authError = error as Partial<AuthError> | null;
    const code = authError?.code ?? "";
    return signupErrorMessageByCode[code] ?? "Não foi possível criar sua conta agora.";
};

export default function SignupForm() {
    const router = useRouter();
    const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { name: "", email: "", password: "", confirmPassword: "", dataPolicyAccepted: false },
        mode: "onTouched",
    });

    const password = form.watch("password");

    const handleInvalid = () => {
        const errors = form.formState.errors;
        const msgs = [errors.name?.message, errors.email?.message, errors.password?.message, errors.confirmPassword?.message, errors.dataPolicyAccepted?.message].filter(Boolean).map(String);
        void VSModalPaged({ title: "Verifique seus dados", messages: Array.from(new Set(msgs)), tone: "error" });
    };

    const handleGoogleSignup = async () => {
        if (isPending) return;
        if (!firebaseApp || !hasFirebaseConfig) {
            void VSModalPaged({ title: "Cadastro indisponível", messages: ["Firebase Auth não está configurado para este ambiente."], tone: "error" });
            return;
        }

        startTransition(async () => {
            try {
                console.info("[SignupView] signup started", { route: "/signupview", provider: "google" });
                const credential = await signInWithGoogle();
                const user = credential.user;
                const uid = user.uid;
                const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
                const normalizedName = user.displayName?.trim() ?? "";
                const idToken = await user.getIdToken(true);

                console.info("[SignupView] Firebase Auth user created", { provider: "google" });
                console.info("[SignupView] uid returned", { uid });

                const response = await fetch("/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid, name: normalizedName, email: normalizedEmail, provider: "google", idToken }),
                });

                const payload = (await response.json().catch(() => null)) as { ok?: boolean; profile?: { user_id?: string; name?: string; email?: string }; error?: string } | null;
                if (!response.ok || !payload?.ok) {
                    console.error("[SignupView] Firestore profile sync failed", { uid, normalizedEmail, status: response.status, error: payload?.error });
                    void VSModalPaged({ title: "Cadastro incompleto", messages: [payload?.error ?? "Conta Google criada, mas falhou ao sincronizar seu perfil."], tone: "error" });
                    return;
                }

                console.info("[SignupView] Firestore profile created", { uid, normalizedEmail });
                console.info("[SignupView] final signup success", { uid, normalizedEmail });

                setAuthSessionProfile({
                    user_id: payload.profile?.user_id?.trim() || uid,
                    name: payload.profile?.name?.trim() || normalizedName || "Usuário",
                    email: payload.profile?.email?.trim().toLowerCase() || normalizedEmail,
                });

                await VSModalPaged({ title: "Conta criada", messages: ["Cadastro com Google concluído com sucesso."], tone: "success" });
                form.reset();
                router.replace("/authview");
            } catch (error) {
                const authError = error as Partial<AuthError> | null;
                console.error("[SignupView] signup failed", { code: authError?.code ?? "unknown", message: authError?.message ?? "Unexpected signup error." });
                void VSModalPaged({
                    title: "Cadastro falhou",
                    messages: [resolveOAuthUserMessage(error, "Não foi possível concluir o cadastro com Google.")],
                    tone: "error",
                });
            }
        });
    };

    const handleSubmit = (values: SignupValues) => {
        startTransition(async () => {
            const parsed = signupSchema.safeParse(values);
            if (!parsed.success) {
                void VSModalPaged({ title: "Verifique seus dados", messages: Array.from(new Set(parsed.error.issues.map(i => i.message))), tone: "error" });
                return;
            }

            if (!firebaseApp || !hasFirebaseConfig) {
                void VSModalPaged({ title: "Cadastro indisponível", messages: ["Firebase Auth não está configurado para este ambiente."], tone: "error" });
                return;
            }

            const normalizedEmail = parsed.data.email.trim().toLowerCase();
            const normalizedName = parsed.data.name.trim();

            console.info("[SignupView] signup started", { route: "/signupview", provider: "password" });
            console.info("[SignupView] normalized email", { normalizedEmail });

            try {
                const auth = getAuth(firebaseApp);
                const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, parsed.data.password);
                const uid = userCredential.user.uid;

                console.info("[SignupView] Firebase Auth user created", { provider: "password" });
                console.info("[SignupView] uid returned", { uid });

                if (normalizedName) {
                    await updateProfile(userCredential.user, { displayName: normalizedName });
                }

                const idToken = await userCredential.user.getIdToken(true);

                const response = await fetch("/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid,
                        name: normalizedName,
                        email: normalizedEmail,
                        provider: "password",
                        idToken,
                    }),
                });

                const payload = (await response.json().catch(() => null)) as { ok?: boolean; profile?: { user_id?: string; name?: string; email?: string }; error?: string } | null;

                if (!response.ok || !payload?.ok) {
                    console.error("[SignupView] Firestore profile sync failed", { uid, normalizedEmail, status: response.status, error: payload?.error });
                    void VSModalPaged({
                        title: "Cadastro incompleto",
                        messages: [payload?.error ?? "Conta criada no Auth, mas não foi possível sincronizar seu perfil. Tente novamente."],
                        tone: "error",
                    });
                    return;
                }

                console.info("[SignupView] Firestore profile created", { uid, normalizedEmail });

                setAuthSessionProfile({
                    user_id: payload.profile?.user_id?.trim() || uid,
                    name: payload.profile?.name?.trim() || normalizedName,
                    email: payload.profile?.email?.trim().toLowerCase() || normalizedEmail,
                });

                console.info("[SignupView] final signup success", { uid, normalizedEmail });
                await VSModalPaged({ title: "Conta criada", messages: [`Bem-vindo(a), ${normalizedName}.`], tone: "success" });
                form.reset();
                router.replace("/authview");
            } catch (error) {
                const authError = error as Partial<AuthError> | null;
                console.error("[SignupView] signup failed", {
                    code: authError?.code ?? "unknown",
                    message: authError?.message ?? "Unexpected signup error.",
                });
                void VSModalPaged({
                    title: "Cadastro falhou",
                    messages: [resolveSignupErrorMessage(error)],
                    tone: "error",
                });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <label style={labelStyle}>Nome completo</label>
                        <FormControl><input placeholder="Seu nome" {...field} style={inputStyle} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <label style={labelStyle}>E-mail</label>
                        <FormControl><input type="email" placeholder="seu@email.com" {...field} style={inputStyle} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <label style={labelStyle}>Senha</label>
                        <FormControl>
                            <div style={{ position: "relative" }}>
                                <input type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" {...field} style={{ ...inputStyle, paddingRight: 44 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}>
                                    <EyeIcon open={showPassword} />
                                </button>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                        <label style={labelStyle}>Confirmar senha</label>
                        <FormControl>
                            <div style={{ position: "relative" }}>
                                <input type={showConfirmPassword ? "text" : "password"} placeholder="Digite a senha novamente" {...field} style={{ ...inputStyle, paddingRight: 44 }} />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}>
                                    <EyeIcon open={showConfirmPassword} />
                                </button>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {/* Password requirements */}
                <div style={{ backgroundColor: "#faf5ff", borderRadius: 8, padding: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontFamily: ff }}>Sua senha deve conter:</p>
                    {[{ test: password.length >= 8, label: "Mínimo 8 caracteres" }, { test: /[A-Z]/.test(password), label: "Uma letra maiúscula" }, { test: /[0-9]/.test(password), label: "Um número" }].map(({ test, label }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: test ? "#22c55e" : "#9ca3af", fontFamily: ff, marginBottom: "0.25rem" }}>
                            <span>{test ? "✓" : "○"}</span> {label}
                        </div>
                    ))}
                </div>

                <FormField control={form.control} name="dataPolicyAccepted" render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                                <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: "#7c3aed" }} />
                                <span style={{ fontSize: "0.875rem", color: "#6b7280", fontFamily: ff }}>
                                    Eu aceito os <a href="#" style={{ color: "#7c3aed", textDecoration: "none" }}>Termos de Uso</a> e a <a href="#" style={{ color: "#7c3aed", textDecoration: "none" }}>Política de Privacidade</a>
                                </span>
                            </label>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <button type="submit" disabled={isPending} style={{ width: "100%", background: "linear-gradient(to right, #7c3aed, #ec4899)", color: "#fff", padding: "12px", borderRadius: 8, border: "none", cursor: isPending ? "not-allowed" : "pointer", fontSize: "1rem", fontWeight: 500, opacity: isPending ? 0.6 : 1, fontFamily: ff }}>
                    {isPending ? "Criando sua conta..." : "Criar conta"}
                </button>

                <div style={{ position: "relative", textAlign: "center", margin: "0.25rem 0" }}>
                    <div style={{ borderTop: "1px solid #e5e7eb", position: "absolute", inset: 0, top: "50%" }} />
                    <span style={{ position: "relative", background: "#fff", padding: "0 1rem", color: "#6b7280", fontSize: "0.875rem", fontFamily: ff }}>Ou cadastre-se com</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <button type="button" disabled={isPending} onClick={handleGoogleSignup} style={{ padding: "12px 16px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#374151", fontSize: "1rem", fontWeight: 500, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1, fontFamily: ff }}>
                        <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Google
                    </button>
                    <button type="button" style={{ padding: "12px 16px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#1877F2", fontSize: "1rem", fontWeight: 500, cursor: "pointer", fontFamily: ff }}>
                        <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Facebook
                    </button>
                </div>
            </form>
        </Form>
    );
}
