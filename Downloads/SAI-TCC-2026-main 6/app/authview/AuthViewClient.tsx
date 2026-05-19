"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { shareTechMono } from "@/app/fonts";
import { VSModalPaged } from "@/app/lib/authAlerts";
import { clearAuthSessionToken, setAuthSessionProfile, setAuthSessionToken } from "@/app/lib/authSession";
import { setDevSessionToken } from "@/app/lib/devSession";
import { clearSharedAccessToken, ensureSharedAccessToken, setSharedAccessData } from "@/app/lib/accessTokenShare";
import {
    extractOAuthErrorDetails,
    resolveOAuthUserMessage,
    signInWithFacebook,
    signInWithGoogle,
    signInWithGoogleRedirect,
} from "@/app/auth";
import { ensureSavedPageBackgroundConfig } from "@/app/lib/pageBackground";
import { firebaseAuthGate } from "@/app/gate/firebaseClient";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    fetchSignInMethodsForEmail,
    getAuth,
    setPersistence,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

const ff = `${shareTechMono.style.fontFamily}, 'Inter', 'Segoe UI', Arial, sans-serif`
const metallicGradient = 'linear-gradient(135deg, #f7e7b2 0%, #d4af37 28%, #f4f4f5 52%, #a3a3a3 74%, #fff5cf 100%)';
const REMEMBERED_EMAIL_KEY = "rememberedEmail";
const SKIPPABLE_FIREBASE_ERROR_CODES = new Set([
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.",
    "auth/invalid-api-key",
    "auth/network-request-failed",
    "auth/configuration-not-found",
    "auth/app-deleted",
    "auth/app-not-authorized",
]);

const normalizeFirebaseErrorCode = (error: unknown): string => {
    const maybeAuthError = error as Partial<FirebaseError> | null;
    return (maybeAuthError?.code ?? "").trim().toLowerCase();
};

const shouldSkipFirebaseSignIn = (error: unknown): boolean => {
    const normalizedCode = normalizeFirebaseErrorCode(error);
    return SKIPPABLE_FIREBASE_ERROR_CODES.has(normalizedCode);
};

const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
);

export default function AuthViewClient() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [submittingForgot, setSubmittingForgot] = useState(false);
    const [socialSubmitting, setSocialSubmitting] = useState<"google" | "facebook" | null>(null);
    const [socialErrorMessage, setSocialErrorMessage] = useState("");
    const [emailLoginErrorMessage, setEmailLoginErrorMessage] = useState("");
    const pathname = usePathname();
    const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();

    useEffect(() => {
        // TODO: reativar verificação do devauthgate em produção
        // const t = getDevSessionToken();
        // if (!t) router.replace("/devauthgate");
        ensureSharedAccessToken();
    }, [router]);

    // Use a ref so the token clear only runs ONCE on mount.
    // Without this, Next.js Turbopack can re-trigger this effect during
    // navigation, wiping the token just after login writes it.
    const didClearOnMount = useRef(false);
    useEffect(() => {
        if (didClearOnMount.current) return;
        didClearOnMount.current = true;
        clearAuthSessionToken();
        clearSharedAccessToken();
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
        if (!savedEmail) return;
        setEmail(savedEmail);
        setRememberMe(true);
    }, []);

    const setFirebasePersistenceMode = async (): Promise<"LOCAL" | "SESSION"> => {
        if (!firebaseApp || !hasFirebaseConfig) {
            console.log("Persistence set:", "SESSION");
            return "SESSION";
        }
        const auth = getAuth(firebaseApp);
        try {
            if (rememberMe) {
                await setPersistence(auth, browserLocalPersistence);
                console.log("Persistence set:", "LOCAL");
                return "LOCAL";
            }
            await setPersistence(auth, browserSessionPersistence);
            console.log("Persistence set:", "SESSION");
            return "SESSION";
        } catch (error) {
            console.error("[AuthView] Failed to set selected persistence, falling back to SESSION:", error);
            try {
                await setPersistence(auth, browserSessionPersistence);
            } catch (fallbackError) {
                console.error("[AuthView] Failed to set SESSION fallback persistence:", fallbackError);
            }
            console.log("Persistence set:", "SESSION");
            return "SESSION";
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setEmailLoginErrorMessage("");
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password;

        const clientProjectId = firebaseApp?.options.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
        const authDomain = firebaseApp?.options.authDomain ?? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
        const appName = firebaseApp?.name ?? "none";
        console.info("[AuthView] Login attempt", {
            provider: "password",
            normalizedEmail,
            projectId: clientProjectId,
            authDomain,
            hasFirebaseConfig,
            firebaseAppName: appName,
            rememberMe,
            route: "/authview",
        });
        if (!normalizedEmail || !normalizedPassword) {
            setSubmitting(false);
            setEmailLoginErrorMessage("E-mail e senha são obrigatórios.");
            void VSModalPaged({ title: "Dados obrigatórios", messages: ["Informe seu e-mail e sua senha para continuar."], tone: "error" });
            return;
        }
        try {
            await setFirebasePersistenceMode();
            let firebaseIdToken = "";
            if (firebaseApp && hasFirebaseConfig) {
                const auth = getAuth(firebaseApp);
                try {
                    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
                    firebaseIdToken = await credential.user.getIdToken(true);
                    console.info("[AuthView] Firebase email/password sign-in succeeded", {
                        provider: "password",
                        normalizedEmail,
                        projectId: clientProjectId,
                    });
                } catch (error: unknown) {
                    const firebaseError = error instanceof FirebaseError ? error : null;
                    const errorCode = firebaseError?.code ?? "auth/unknown";
                    const errorMessage = firebaseError?.message ?? "Unknown Firebase auth error.";
                    let signInMethods: string[] = [];
                    try {
                        signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
                    } catch (fetchMethodsError) {
                        console.warn("[AuthView] Could not resolve sign-in methods for email", fetchMethodsError);
                    }

                    console.error("[AuthView] Firebase email/password sign-in failed", {
                        provider: "password",
                        normalizedEmail,
                        projectId: clientProjectId,
                        authDomain,
                        errorCode,
                        errorMessage,
                        signInMethods,
                    });

                    const invalidCredentialCodes = new Set([
                        "auth/invalid-credential",
                        "auth/wrong-password",
                        "auth/user-not-found",
                        "auth/invalid-login-credentials",
                    ]);
                    const configOrProviderCodes = new Set([
                        "auth/operation-not-allowed",
                        "auth/invalid-api-key",
                        "auth/app-not-authorized",
                        "auth/unauthorized-domain",
                        "auth/configuration-not-found",
                    ]);

                    const hasPasswordProvider = signInMethods.includes("password");
                    const hasSocialProviderOnly = signInMethods.some((method) => method !== "password") && !hasPasswordProvider;

                    let userMessage = "Não foi possível autenticar no momento. Tente novamente.";
                    if (invalidCredentialCodes.has(errorCode)) {
                        userMessage = hasSocialProviderOnly
                            ? "Esta conta foi criada com login social. Entre com Google/Facebook ou redefina sua senha para usar e-mail e senha."
                            : "E-mail ou senha inválidos.";
                    } else if (configOrProviderCodes.has(errorCode)) {
                        userMessage = "O login por e-mail/senha está desabilitado ou com configuração inválida no Firebase.";
                    }

                    setEmailLoginErrorMessage(userMessage);
                    void VSModalPaged({ title: "Falha no login", messages: [userMessage], tone: "error" });
                    setSubmitting(false);
                    return;
                }
            } else {
                console.warn("[AuthView] Firebase config not available; using /api/auth/verify only", {
                    provider: "password",
                    normalizedEmail,
                    projectId: clientProjectId,
                    authDomain,
                    hasFirebaseConfig,
                });
            }
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword, idToken: firebaseIdToken }),
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as { error?: string } | null;
                const userMessage = response.status === 401
                    ? "E-mail ou senha inválidos."
                    : (data?.error ?? "Não foi possível validar suas credenciais agora.");
                setEmailLoginErrorMessage(userMessage);
                void VSModalPaged({ title: "Acesso negado", messages: [userMessage], tone: "error" });
                setSubmitting(false);
                return;
            }
            const payload = (await response.json().catch(() => null)) as { profile?: { user_id?: string; name?: string; email?: string } } | null;
            const token = crypto.randomUUID();
            const profile = {
                user_id: payload?.profile?.user_id?.trim() || "",
                name: payload?.profile?.name?.trim() || "",
                email: payload?.profile?.email?.trim().toLowerCase() || normalizedEmail,
            };
            setAuthSessionToken(token);
            setAuthSessionProfile(profile);
            setDevSessionToken(token);
            setSharedAccessData({ token, profile });
            if (rememberMe) {
                window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
            } else {
                window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
            }
            ensureSavedPageBackgroundConfig();
            router.replace("/home");
        } catch (error) {
            console.error("[AuthView] Unexpected login failure", error);
            setEmailLoginErrorMessage("Não foi possível validar suas credenciais agora.");
            void VSModalPaged({ title: "Erro inesperado", messages: ["Não foi possível validar suas credenciais agora."], tone: "error" });
            setSubmitting(false);
        }
    };

    const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submittingForgot) return;
        const normalizedEmail = forgotEmail.trim().toLowerCase();
        if (!normalizedEmail) {
            void VSModalPaged({
                title: "Email required",
                messages: ["Please enter your email address to continue."],
                tone: "error",
            });
            return;
        }

        setSubmittingForgot(true);
        try {
            const response = await fetch("/api/auth/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as { error?: string } | null;
                void VSModalPaged({
                    title: "Reset failed",
                    messages: [data?.error ?? "We could not send a reset link right now."],
                    tone: "error",
                });
                return;
            }

            void VSModalPaged({
                title: "Check your email",
                messages: ["We sent a redefinition link to your inbox. Follow it to reset your password."],
                tone: "success",
            });
            setShowForgotModal(false);
            setForgotEmail("");
        } catch (error) {
            console.error("[ForgetPassword] Failed to request reset:", error);
            void VSModalPaged({
                title: "Unexpected error",
                messages: ["Unable to send the reset email right now."],
                tone: "error",
            });
        } finally {
            setSubmittingForgot(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "12px 16px", backgroundColor: "#f9fafb", borderRadius: 8,
        border: "1px solid #e5e7eb", outline: "none", color: "#111827", fontSize: "1rem",
        fontFamily: ff, boxSizing: "border-box",
    };

    const handleSocialSignIn = async (provider: "google" | "facebook") => {
        if (socialSubmitting) return;
        setSocialSubmitting(provider);
        setSocialErrorMessage("");
        try {
            console.log("RememberMe:", rememberMe);
            await setFirebasePersistenceMode();
            const credential = provider === "google" ? await signInWithGoogle() : await signInWithFacebook();
            const user = credential.user;
            const uid = user.uid;
            const normalizedEmail = user.email?.trim().toLowerCase() || "";
            const normalizedName = user.displayName?.trim() || "Usuário";
            const idToken = await user.getIdToken(true);

            const syncResponse = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid,
                    email: normalizedEmail,
                    name: normalizedName,
                    provider,
                    idToken,
                }),
            });
            const syncPayload = (await syncResponse.json().catch(() => null)) as { ok?: boolean; profile?: { user_id?: string; name?: string; email?: string }; error?: string } | null;
            if (!syncResponse.ok || !syncPayload?.ok) {
                console.error("[AuthView] social profile sync failed", {
                    provider,
                    uid,
                    normalizedEmail,
                    status: syncResponse.status,
                    error: syncPayload?.error,
                });
                throw new Error(syncPayload?.error ?? "Social profile sync failed.");
            }

            const token = crypto.randomUUID();
            const profile = {
                user_id: syncPayload.profile?.user_id?.trim() || uid,
                name: syncPayload.profile?.name?.trim() || normalizedName,
                email: syncPayload.profile?.email?.trim().toLowerCase() || normalizedEmail,
            };
            setAuthSessionToken(token);
            setAuthSessionProfile(profile);
            setDevSessionToken(token);
            setSharedAccessData({ token, profile });
            ensureSavedPageBackgroundConfig();
            router.replace("/home");
        } catch (error: unknown) {
            const oauthError = extractOAuthErrorDetails(error);
            const providerLabel = provider === "google" ? "Google" : "Facebook";
            console.error(`[AuthView] ${providerLabel} OAuth failed`, {
                ...oauthError,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
                route: "/authview",
            });

            if (provider === "google" && oauthError.code === "auth/popup-blocked") {
                try {
                    await signInWithGoogleRedirect();
                    return;
                } catch (redirectError: unknown) {
                    const redirectOAuthError = extractOAuthErrorDetails(redirectError);
                    console.error("[AuthView] Google redirect fallback failed", redirectOAuthError);
                }
            }

            const userMessageByCode: Record<string, string> = {
                "auth/invalid-credential": "Sua sessão de autenticação está inválida. Atualize a página e tente novamente.",
                "auth/popup-blocked": "Seu navegador bloqueou o popup de login. Permita popups para este site e tente novamente.",
                "auth/popup-closed-by-user": "O popup de login foi fechado antes da conclusão. Tente novamente.",
            };

            const fallbackMessage = "Não foi possível autenticar com o provedor selecionado. Verifique a configuração do Firebase Auth e tente novamente.";
            const userMessage = resolveOAuthUserMessage(
                error,
                userMessageByCode[oauthError.code] ?? fallbackMessage
            );

            setSocialErrorMessage(userMessage);
            void VSModalPaged({
                title: "Falha no login social",
                messages: [userMessage],
                tone: "error",
            });
        } finally {
            setSocialSubmitting(null);
        }
    };

    return (
        <div style={{ fontFamily: ff, minHeight: "100vh", display: "flex", backgroundImage: "none", backgroundColor: "#fff" }}>
            {/* Left - Branding */}
            <div style={{ background: metallicGradient, padding: "3rem", width: "50%", flexDirection: "column", justifyContent: "space-between" }} className="hidden lg:flex">
                <div style={{ border: "2px solid rgba(255,255,255,0.92)", borderRadius: 24, background: "rgba(255,255,255,0.06)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1.5rem", minHeight: 220, textAlign: "center", background: "linear-gradient(145deg, rgba(30,30,30,0.55), rgba(10,10,10,0.35))", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 18, padding: "1.5rem" }}>
                            <Image
                                src="/FAI-removebg-preview.png"
                                alt="Logo metálico oficial da FAI"
                                width={168}
                                height={168}
                                style={{ width: "100%", maxWidth: 280, height: "auto", objectFit: "contain" }}
                            />
                        <div>
                            <div style={{ color: "#fff", fontSize: "2.4rem", fontWeight: 700, fontFamily: ff, lineHeight: 1.1, maxWidth: 360, textAlign: "center" }}>
                                Welcome back to Fashion AI!
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.05rem", marginTop: "0.45rem", fontFamily: ff, textAlign: "center" }}>
                                Seu estilista pessoal
                            </div>
                        </div>
                    </div>
                    <div style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.88), rgba(245,245,245,0.72))", border: "1px solid rgba(17,24,39,0.16)", borderRadius: 18, padding: "1.5rem" }}>
                        <div style={{ fontSize: "2.25rem", fontWeight: 600, color: "#111827", marginBottom: "1.5rem", lineHeight: 1.3, fontFamily: ff }}>Organize seu estilo<br />com inteligência artificial</div>
                        <p style={{ color: "rgba(17,24,39,0.82)", fontSize: "1.125rem", marginBottom: "2rem", fontFamily: ff }}>Crie combinações perfeitas, gerencie seu guarda-roupa e descubra seu estilo único com a ajuda da IA.</p>
                        {[["✨", "Sugestões inteligentes de looks"], ["👔", "Guarda-roupa digital organizado"], ["🎨", "Visualização em manequim 3D"]].map(([icon, text]) => (
                            <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                                <div style={{ width: 40, height: 40, background: "rgba(17,24,39,0.08)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                                </div>
                                <p style={{ color: "rgba(17,24,39,0.9)", fontFamily: ff }}>{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", fontFamily: ff }}>© 2026 Fashion AI. Todos os direitos reservados.</div>
            </div>

            {/* Right - Form */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", backgroundColor: "#f8fafc", position: "relative", overflow: "hidden", backgroundImage: "url(/Firefly_Gemini Flash_Crie ideias de background muito bons para um novo website de moda, usando uma rede de 3787887.png)", backgroundSize: "cover", backgroundPosition: "center" }}>
                <Image
                    src="/Fart.png"
                    alt="Fashion AI network background"
                    fill
                    priority
                    style={{ objectFit: "cover" }}
                />
                <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
                    <div style={{ background: "rgba(255,255,255,0.28)", border: "2px solid #000", borderRadius: 24, padding: "2rem", backdropFilter: "blur(14px) saturate(155%)", WebkitBackdropFilter: "blur(14px) saturate(155%)", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.22)" }}>
                        <div style={{ marginBottom: "2rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", marginBottom: "0.5rem", fontFamily: ff }}>Bem-vindo de volta</h2>
                            <p style={{ color: "#6b7280", fontFamily: ff }}>Entre com suas credenciais para acessar sua conta</p>
                        </div>

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div>
                            <label htmlFor="auth-email" style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem", fontFamily: ff }}>E-mail</label>
                            <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required style={{ ...inputStyle, paddingLeft: 16 }} />
                        </div>

                        <div>
                            <label htmlFor="auth-password" style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem", fontFamily: ff }}>Senha</label>
                            <div style={{ position: "relative" }}>
                                <input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inputStyle, paddingRight: 48 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}>
                                    <EyeIcon open={showPassword} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <label htmlFor="remember-me" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontFamily: ff }}>
                                <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: 16, height: 16 }} />
                                <span style={{ fontSize: "0.875rem", color: "#4b5563", fontFamily: ff }}>Lembrar de mim</span>
                            </label>
                            <button type="button" onClick={() => setShowForgotModal(true)} style={{ fontSize: "0.875rem", color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: ff }}>
                                Esqueceu a senha?
                            </button>
                        </div>

                        {emailLoginErrorMessage ? (
                            <div
                                role="alert"
                                style={{
                                    padding: "0.75rem 1rem",
                                    borderRadius: 8,
                                    border: "1px solid #fecaca",
                                    backgroundColor: "#fef2f2",
                                    color: "#991b1b",
                                    fontSize: "0.875rem",
                                    fontFamily: ff,
                                }}
                            >
                                {emailLoginErrorMessage}
                            </div>
                        ) : null}

                        <button type="submit" disabled={submitting} style={{ width: "100%", background: "linear-gradient(to right, #7c3aed, #ec4899)", color: "#fff", padding: "12px", borderRadius: 8, border: "none", cursor: submitting ? "not-allowed" : "pointer", fontSize: "1rem", fontWeight: 500, opacity: submitting ? 0.6 : 1, fontFamily: ff }}>
                            {submitting ? "Entrando..." : "Entrar"}
                        </button>

                        <div style={{ position: "relative", textAlign: "center" }}>
                            <div style={{ borderTop: "1px solid #e5e7eb", position: "absolute", inset: 0, top: "50%" }} />
                            <span style={{ position: "relative", background: "#fff", padding: "0 1rem", color: "#6b7280", fontSize: "0.875rem", fontFamily: ff }}>Ou continue com</span>
                        </div>
                        {socialErrorMessage ? (
                            <div
                                role="alert"
                                style={{
                                    padding: "0.75rem 1rem",
                                    borderRadius: 8,
                                    border: "1px solid #fecaca",
                                    backgroundColor: "#fef2f2",
                                    color: "#991b1b",
                                    fontSize: "0.875rem",
                                    fontFamily: ff,
                                }}
                            >
                                {socialErrorMessage}
                            </div>
                        ) : null}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <button type="button" onClick={() => void handleSocialSignIn("google")} disabled={Boolean(socialSubmitting)} style={{ padding: "12px 16px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#374151", fontSize: "1rem", fontWeight: 500, cursor: socialSubmitting ? "not-allowed" : "pointer", fontFamily: ff, opacity: socialSubmitting === "google" ? 0.6 : 1 }}>
                                <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                {socialSubmitting === "google" ? "Entrando..." : "Google"}
                            </button>
                            <button type="button" onClick={() => void handleSocialSignIn("facebook")} disabled={Boolean(socialSubmitting)} style={{ padding: "12px 16px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#1877F2", fontSize: "1rem", fontWeight: 500, cursor: socialSubmitting ? "not-allowed" : "pointer", fontFamily: ff, opacity: socialSubmitting === "facebook" ? 0.6 : 1 }}>
                                <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                {socialSubmitting === "facebook" ? "Entrando..." : "Facebook"}
                            </button>
                        </div>
                    </form>

                        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#6b7280", marginTop: "2rem", fontFamily: ff }}>
                            Não tem uma conta?{" "}
                            <button onClick={() => router.push("/signupview")} style={{ color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: ff }}>
                                Criar conta
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {showForgotModal ? (
                <div
                    onClick={() => setShowForgotModal(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(15,23,42,0.5)",
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem",
                    }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: 740,
                            minHeight: 330,
                            borderRadius: 20,
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                            boxShadow: "0 24px 60px rgba(30, 64, 175, 0.2)",
                            border: "1px solid rgba(147, 197, 253, 0.45)",
                            display: "flex",
                        }}
                    >
                        <div
                            className="hidden md:flex"
                            style={{
                                width: "44%",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: "1.25rem",
                                padding: "1.7rem",
                                color: "#ffffff",
                                background: "linear-gradient(165deg, #1d4ed8 0%, #2563eb 45%, #38bdf8 100%)",
                            }}
                        >
                            <div>
                                <div style={{ fontSize: "2rem", fontWeight: 700 }}>Fashion AI</div>
                                <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.9)", marginTop: "0.5rem" }}>
                                    Secure account recovery with a quick reset link.
                                </p>
                            </div>
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                {["Account protection", "One-click reset", "Fast inbox delivery"].map((item) => (
                                    <div
                                        key={item}
                                        style={{
                                            borderRadius: 10,
                                            backgroundColor: "rgba(255,255,255,0.16)",
                                            border: "1px solid rgba(255,255,255,0.3)",
                                            padding: "0.6rem 0.8rem",
                                            fontSize: "1rem",
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
                                padding: "1.5rem",
                            }}
                        >
                            <form onSubmit={handleForgotSubmit} style={{ width: "100%", maxWidth: 360, display: "grid", gap: "1rem" }}>
                                <label style={{ display: "grid", gap: "0.5rem", color: "#1e3a8a", fontWeight: 600, fontSize: "0.95rem" }}>
                                    Email address
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(event) => setForgotEmail(event.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-base text-blue-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300/70"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={submittingForgot}
                                    style={{
                                        width: "100%",
                                        border: "none",
                                        borderRadius: 12,
                                        padding: "0.8rem 1rem",
                                        fontSize: "0.95rem",
                                        fontWeight: 600,
                                        color: "#ffffff",
                                        cursor: submittingForgot ? "not-allowed" : "pointer",
                                        opacity: submittingForgot ? 0.7 : 1,
                                        background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #38bdf8 100%)",
                                    }}
                                >
                                    {submittingForgot ? "Sending..." : "Email the reset link"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(false)}
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
                                    onClick={() => {
                                        setShowForgotModal(false);
                                        router.push("/signupview");
                                    }}
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
                </div>
            ) : null}
        </div>
    );
}