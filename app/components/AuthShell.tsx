import type { ReactNode } from "react";

type AuthShellProps = {
    title: string;
    subtitle: string;
    description?: string;
    children: ReactNode;
    extraDecorations?: ReactNode;
};

const GLASS = "border border-white/20 bg-white/10";
const GLASS_DEEP = "border border-white/18 bg-white/8 backdrop-blur-2xl";

const FILTER_GLOW_BAR =
    "bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_12px_40px_rgba(124,58,237,0.18)]";
const FILTER_GLOW_LINE =
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-[radial-gradient(800px_200px_at_50%_0%,rgba(124,58,237,0.35),transparent_55%)]";

const GLOW_BAR =
    "bg-gradient-to-r border-amber-300 border-8 from-cyan-500 via-teal-400 to-emerald-500 " +
    "shadow-[0_14px_45px_rgba(16,185,129,0.25)]";

const GLOW_LINE =
    "after:content-[''] border-amber-300 border-8 after:absolute after:left-6 after:right-6 after:-bottom-2 " +
    "after:h-[10px] after:rounded-full after:bg-gradient-to-r after:from-cyan-400/40 after:via-teal-300/40 after:to-emerald-400/40 " +
    "after:blur-xl";

const TEXT_GLOW = "text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)]";

// 🍏 Apple Glassmorphism Tokens
const GLASS_PANEL =
    "relative rounded-3xl border border-white/15 bg-white/[0.08] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]";

const GLASS_INPUT =
    "h-12 w-full rounded-2xl border border-white/14 bg-white/[0.08] backdrop-blur-2xl px-3 text-white placeholder:text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35";

export default function AuthShell({ title, subtitle, description, children, extraDecorations }: AuthShellProps) {
    return (
        <div
            className={[
                "relative min-h-screen",
                 "fe-form-material",
                "px-4 py-10 sm:px-8",
            ].join(" ")}
        >

            <div className="absolute left-16 top-6 z-20">
                <div
                    className={[
                        "rounded-2xl",
                        "px-4 py-3",
                        "w-fit",
                        "bg-white",
                        "text-amber-500",
                        GLOW_LINE,
                        "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
                    ].join(" ")}
                >
                    <div className="flex items-center gap-4">
                        <img
                            src="/1E8229A2-91F0-4EE7-A227-8B9CF14A4F2B.png"
                            alt="Velion Infyra Technology Platforms, Inc."
                            className="h-14 w-auto"
                        />
                        <div className="hidden sm:block font-sametech leading-tight">
                            <div className="text-xs font-semibold tracking-[0.22em] text-orange-600 uppercase">
                                Friendly Eats
                            </div>
                            <div className="text-sm font-semibold text-amber-500">

                            </div>
                        </div>

                    </div>

                </div>


            </div>

            <div className="absolute right-16 top-6 z-20">
                <div
                    className={[
                        "rounded-2xl",
                        "px-4 py-3",
                        "w-fit",
                        "bg-white",
                        "text-amber-500",
                        GLOW_LINE,
                        "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
                    ].join(" ")}
                >
                    <div className="flex items-center gap-4">
                        <img
                            src="/VI.jpeg"
                            alt="Velion Infyra Technology Platforms, Inc."
                            className="h-14 w-auto"
                        />
                        <div className="hidden sm:block font-sametech leading-tight">
                            <div className="text-xs font-semibold tracking-[0.22em] text-amber-500 uppercase">
                                Velion
                            </div>
                            <div className="text-sm font-semibold text-amber-500">
                                Velion Infyra Technology Platforms, Inc.
                            </div>
                        </div>

                    </div>

                </div>


            </div>

            <main className="relative z-10 flex w-full items-center justify-center pt-24 sm:pt-28 lg:pt-32">

                <div
                    className={[
                        "relative flex w-full max-w-5xl flex-col items-center gap-10 px-6 py-10 lg:flex-row lg:items-start lg:justify-between",
                        "rounded-3xl",
                        GLOW_BAR,
                        GLOW_LINE,
                        "bg-[url('/bg-panel.png')]",
                    ].join(" ")}
                >

                    {/* ✅ FORM RETANGLE: rounded + amber border-8 */}
                    <div
                        className={[
                            "w-full space-y-6",
                            "rounded-3xl",
                             "bg-[url('/bg-panel.png')]",
                            "border-amber-300 border-4",
                            "p-6 sm:p-8",
                            "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                        ].join(" ")}
                    >
                        <div
                            className={[
                                "rounded-2xl",
                                "w-full",
                                "bg-white",
                                "text-amber-500",
                                GLOW_LINE,
                                "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
                                "px-4 py-4 sm:px-8 sm:py-5",
                            ].join(" ")}
                        >
                            <div className="flex flex-col items-center justify-center gap-3">
                                {/* Logo responsivo */}
                                <img
                                    src="/1E8229A2-91F0-4EE7-A227-8B9CF14A4F2B.png"
                                    alt="Velion Infyra Technology Platforms, Inc."
                                    className={[
                                        "w-80",
                                        "h-82 sm:h-22 md:h-68 lg:h-68",       // altura cresce por breakpoint
                                        "max-w-[220px] sm:max-w-[320px] md:max-w-[420px] lg:max-w-[520px]", // limita largura
                                        "object-contain",
                                    ].join(" ")}
                                />

                                <div className="hidden sm:block font-sametech leading-tight">
                                    <div className="text-xl font-semibold tracking-[0.22em] text-orange-500 uppercase">
                                        Connecting you to places that matter
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className={[
                            "space-y-4",
                            "rounded-3xl",
                            "border-amber-300 border-8", // ✅ requested
                             "bg-white",
                            "p-6 sm:p-8",
                            "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                        ].join(" ")}>
                            <p className="text-xs font-semibold items-center font-sharetech uppercase tracking-[0.35em] text-orange-600">
                                {title}
                            </p>
                            <h1 className="text-3xl items-center font-semibold text-orange-600">
                                {subtitle}
                            </h1>
                            {description ? (
                                <p className="text-2xl font-medium text-orange-600 leading-relaxed">
                                    {description}
                                </p>
                            ) : null}
                        </div>

                        {/* children wrapper (kept) */}
                        <div className="mt-6 w-full space-y-6">{children}</div>
                    </div>
                </div>
            </main>

        </div>


    );
}

