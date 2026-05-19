"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import SignupForm from "./SignupForm";
import { clearSharedAccessToken, ensureSharedAccessToken } from "@/app/lib/accessTokenShare";
import { clearAuthSessionToken } from "@/app/lib/authSession";

const ff = "'Inter', 'Segoe UI', Arial, sans-serif";
const metallicGradient = "linear-gradient(135deg, #f7e7b2 0%, #d4af37 28%, #f4f4f5 52%, #a3a3a3 74%, #fff5cf 100%)";

export default function SignupViewPage() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // TODO: reativar verificação do devauthgate em produção
        // const t = getDevSessionToken();
        // if (!t) router.replace("/devauthgate");
        ensureSharedAccessToken();
    }, [router]);

    useEffect(() => {
        if (pathname !== "/signupview") return;
        clearAuthSessionToken();
        clearSharedAccessToken();
    }, [pathname]);

    return (
        <div style={{ fontFamily: ff, minHeight: "100vh", display: "flex", backgroundImage: "none", backgroundColor: "#fff" }}>
            {/* Left Side */}
            <div style={{ background: metallicGradient, padding: "3rem", width: "50%", flexDirection: "column", justifyContent: "space-between" }} className="hidden lg:flex">
                <div style={{ border: "2px solid rgba(255,255,255,0.92)", borderRadius: 24, background: "rgba(255,255,255,0.06)", padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
                        <div style={{ width: 168, height: 168, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 18px 40px rgba(15, 23, 42, 0.4)", border: "1px solid rgba(255,255,255,0.35)" }}>
                            <Image
                                src="/Firefly_Gemini Flash_Consegue melhorar o logo da bolsa FAI para que fique com gradiente metalico do logo S 3787887.png"
                                alt="Logo metálico oficial da FAI"
                                width={168}
                                height={168}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        </div>
                        <div>
                            <div style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 600, fontFamily: ff }}>Create a new account in minutes!</div>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: "2.25rem", fontWeight: 600, color: "#fff", marginBottom: "1.5rem", lineHeight: 1.3, fontFamily: ff }}>Comece sua jornada<br />de estilo hoje</div>
                        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.125rem", marginBottom: "2rem", fontFamily: ff }}>Junte-se a milhares de usuários que transformaram sua forma de se vestir com a ajuda da IA.</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", textAlign: "center" }}>
                            {[["10k+", "Usuários"], ["50k+", "Looks Criados"], ["4.9", "Avaliação"]].map(([num, label]) => (
                                <div key={label}>
                                    <div style={{ fontSize: "1.875rem", fontWeight: 600, color: "#fff", fontFamily: ff }}>{num}</div>
                                    <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", fontFamily: ff }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", fontFamily: ff }}>© 2026 Fashion AI. Todos os direitos reservados.</div>
            </div>

            {/* Right Side */}
            <div style={{ flex: 1, backgroundColor: "#f8fafc", position: "relative", overflow: "hidden", backgroundImage: "url(/Firefly_Gemini Flash_Crie ideias de background muito bons para um novo website de moda, usando uma rede de 3787887.png)", backgroundSize: "cover", backgroundPosition: "center" }}>
                <Image
                    src="/Fart.png"
                    alt="Fashion AI network background"
                    fill
                    priority
                    style={{ objectFit: "cover" }}
                />
                <div
                    style={{
                        position: "relative",
                        zIndex: 1,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2rem",
                        overflowY: "auto",
                        overflowX: "hidden",
                    }}
                >
                    <div style={{ width: "100%", maxWidth: 448 }}>
                        <button onClick={() => router.push("/authview")} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: "2rem", fontSize: "0.875rem", fontFamily: ff }}>
                            ← Voltar para login
                        </button>
                        <div style={{ background: "#fff", border: "2px solid #000", borderRadius: 24, padding: "2rem" }}>
                            <div style={{ marginBottom: "2rem" }}>
                                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", marginBottom: "0.5rem", fontFamily: ff }}>Criar sua conta</h2>
                                <p style={{ color: "#6b7280", fontFamily: ff }}>Preencha os dados abaixo para começar</p>
                            </div>
                            <SignupForm />
                            <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#6b7280", marginTop: "2rem", fontFamily: ff }}>
                                Já tem uma conta?{" "}
                                <button onClick={() => router.push("/authview")} style={{ color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: ff }}>
                                    Fazer login
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
