"use client";

import { useEffect } from "react";
import { useAuthGate } from "@/app/gate/auth";
import { usePathname, useRouter } from "next/navigation";
import { clearDevSessionToken, getDevSessionToken, setDevSessionToken } from "@/app/lib/devSession";
import { clearAuthSessionProfile, clearAuthSessionToken } from "@/app/lib/authSession";
import { clearSharedAccessToken } from "@/app/lib/accessTokenShare";

const ff = "'Inter', 'Segoe UI', Arial, sans-serif";

export default function DevAuthGate() {
    const { googleAuthed, googleUserId, googleError, pinInput, setPinInput, pinVerified, pinError, pinLocked, verifyPin, resetGate } = useAuthGate();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (pathname !== "/devauthgate") return;
        resetGate(); clearDevSessionToken(); clearAuthSessionToken(); clearAuthSessionProfile(); clearSharedAccessToken();
    }, [pathname, resetGate]);

    useEffect(() => {
        if (!googleAuthed || !pinVerified) return;
        if (!getDevSessionToken()) setDevSessionToken(crypto.randomUUID());
    }, [googleAuthed, pinVerified]);

    useEffect(() => {
        if (getDevSessionToken() && pinVerified) router.replace("/authview");
    }, [googleAuthed, pinVerified, router]);

    return (
        <div style={{ fontFamily: ff, minHeight: "100vh", display: "flex", backgroundImage: "none", backgroundColor: "#fff" }}>
            {/* Left Side */}
            <div style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)", padding: "3rem", width: "50%", flexDirection: "column", justifyContent: "space-between" }} className="hidden lg:flex">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: 48, height: 48, background: "rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "1.5rem" }}>✨</span>
                    </div>
                    <div>
                        <div style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 600, fontFamily: ff }}>Fashion AI</div>
                        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.875rem", fontFamily: ff }}>Seu estilista pessoal</div>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: "2.25rem", fontWeight: 600, color: "#fff", marginBottom: "1.5rem", lineHeight: 1.3, fontFamily: ff }}>
                        Acesso restrito<br />aos desenvolvedores
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.125rem", marginBottom: "2rem", fontFamily: ff }}>
                        Esta área é exclusiva para a equipe de desenvolvimento do Fashion AI.
                    </p>
                    {[["🔒", "Autenticação via Google"], ["🔑", "Verificação de PIN"], ["🛡️", "Acesso seguro ao sistema"]].map(([icon, text]) => (
                        <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                            <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                            </div>
                            <p style={{ color: "rgba(255,255,255,0.9)", fontFamily: ff }}>{text}</p>
                        </div>
                    ))}
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", fontFamily: ff }}>© 2026 Fashion AI. Todos os direitos reservados.</div>
            </div>

            {/* Right Side */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", backgroundColor: "#fff" }}>
                <div style={{ width: "100%", maxWidth: 448 }}>
                    <div style={{ marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", marginBottom: "0.5rem", fontFamily: ff }}>Acesso de desenvolvedor</h2>
                        <p style={{ color: "#6b7280", fontFamily: ff }}>Faça login com Google e insira seu PIN para continuar</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {/* Google */}
                        <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.75rem", fontFamily: ff }}>1. Login com Google</p>
                            <div id="google-signin" style={{ minHeight: 44 }} />
                            {googleError && <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#ef4444", fontFamily: ff }}>{googleError}</p>}
                            {googleAuthed && (
                                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, color: "#15803d", fontFamily: ff }}>
                                    ✓ Conectado como {googleUserId}
                                </div>
                            )}
                        </div>

                        {/* PIN */}
                        <div style={{ padding: "1.5rem", backgroundColor: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.75rem", fontFamily: ff }}>2. Verificação de PIN</p>
                            <input
                                type="password"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && verifyPin()}
                                placeholder="Digite seu PIN"
                                style={{ width: "100%", padding: "12px 16px", backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", outline: "none", color: "#111827", fontSize: "1rem", fontFamily: ff, boxSizing: "border-box" }}
                            />
                            {pinError && <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#ef4444", fontFamily: ff }}>{pinError}</p>}
                            {pinVerified && <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#15803d", fontFamily: ff }}>✓ PIN verificado</p>}
                            <button
                                type="button"
                                onClick={verifyPin}
                                disabled={!pinInput.trim() || pinLocked}
                                style={{ marginTop: "0.75rem", width: "100%", background: !pinInput.trim() || pinLocked ? "#e5e7eb" : "linear-gradient(to right, #7c3aed, #ec4899)", color: !pinInput.trim() || pinLocked ? "#9ca3af" : "#fff", padding: "10px", borderRadius: 8, border: "none", cursor: !pinInput.trim() || pinLocked ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 500, fontFamily: ff }}
                            >
                                Verificar PIN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
