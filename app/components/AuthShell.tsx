import type { ReactNode } from "react";

type AuthShellProps = {
    title: string;
    subtitle: string;
    description?: string;
    children: ReactNode;
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

export default function AuthShell({ title, subtitle, description, children }: AuthShellProps) {
    return (
        <div
            className={[
                "relative min-h-screen overflow-hidden",
                "bg-transparent",
                "px-4 py-10 sm:px-8",
            ].join(" ")}
        >

            {/* ✅ Fundo: glow verde claro + glow amarelo claro (bem leve) */}
            <div className="pointer-events-none absolute inset-0">
                {/* “wash” branco suave (base) */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-teal-600 to-orange-500" />

                {/* glow verde claro (bem claro) */}
                <div className="absolute -top-44 left-1/2 h-[720px] w-[720px] -translate-x-1/2 rounded-full
                 bg-gradient-to-br from-yellow-200 via-teal-600 to-amber-900
                  blur-[450px] opacity-80" />

                <div className="absolute top-[18%] -left-56 h-[760px] w-[760px] rounded-full
                 bg-orange-600
                  blur-[170px] " />

                {/* glow amarelo claro (bem claro) */}
                <div className="absolute bottom-[4%] -right-60 h-[820px] w-[820px] rounded-full
                  from-yellow-200 via-teal-600 to-amber-900
                  blur-[180px] " />

                <div className="absolute -bottom-[50%] left-[3%] h-[640px] w-[640px] rounded-full
                  bg-[radial-gradient(rgba(254,240,138,0.25))]
                  blur-[170px]" />

                {/* textura de grid MUITO sutil */}
                <div className="absolute inset-0 opacity-[0.05]
                  [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.32)_1px,transparent_0)]
                  [background-size:18px_18px]" />
            </div>

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

            {/* decorations */}
            <div className="pointer-events-none absolute inset-0">
                {/* original */}
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-6 top-0 h-24 w-24 drop-shadow-[0_16px_30px_rgba(37,99,235,0.25)]"
                />
                <img
                    src="/losangle-orange.svg"
                    alt=""
                    className="absolute right-10 bottom-24 h-24 w-24 drop-shadow-[0_16px_30px_rgba(249,115,22,0.25)]"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute right-74 top-8 h-216 w-216 "
                />
                <img
                    src="/losangle-orange.svg"
                    alt=""
                    className="absolute left-76 bottom-20 h-216 w-216 "
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute right-72 top-2 h-214 w-214 "
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute right-52 top-2 h-104 w-14"
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute right-4 bottom-14 h-120 w-210 opacity-70"
                />

                {/* ✅ more spread decorations */}
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-20 top-24 h-210 w-210 rotate-12"
                />
                <img
                    src="/losangle-orange.svg"
                    alt=""
                    className="absolute left-40 top-44 h-14 w-14  -rotate-6"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[38%] top-16 h-12 w-12  "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[38%] top-116 h-12 w-12  "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[48%] top-116 h-212 w-212  "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[48%] bottom-116 h-212 w-212 "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[28%] bottom-116 h-212 w-212 "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[18%] bottom-[50%] h-212 w-212 "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[18%] bottom-[60%] h-212 w-212 "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute right-[1%] bottom-[50%] h-212 w-212 "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[1%] bottom-[60%] h-212 w-212 "
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[68%] bottom-116 h-12 w-12  rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[28%] bottom-116 h-12 w-12  rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[28%] bottom-216 h-12 w-12 opacity-55 rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[48%] bottom-76 h-12 w-12 opacity-55 rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[108%] top-116 h-12 w-12 opacity-55 rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[87%] top-96 h-12 w-12 opacity-55 rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[67%] top-66 h-12 w-12 opacity-55 rotate-45"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[47%] top-66 h-12 w-12  rotate-45"
                />
                <img
                    src="/losangle-orange.svg"
                    alt=""
                    className="absolute right-[34%] top-20 h-10 w-10  -rotate-12"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute right-[50%] top-14 h-14 w-14  rotate-[18deg]"
                />
                <img
                    src="/losangle-orange.svg"
                    alt=""
                    className="absolute right-[5%] top-[%54] h-12 w-12  rotate-[22deg]"
                />
                <img
                    src="/losangle-blue.svg"
                    alt=""
                    className="absolute left-[5%] bottom-16 h-16 w-16  -rotate-[14deg]"
                />

                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute right-10 top-28 h-10 w-10 "
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute left-[2%] bottom-[37%] h-16 w-16  -rotate-[14deg]"
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute left-[2%] bottom-[77%] h-16 w-16  -rotate-[14deg]"
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute left-[2%] bottom-[57%] h-16 w-16 opacity-50 -rotate-[14deg]"
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute left-[2%] bottom-[57%] h-16 w-16 opacity-50 -rotate-[14deg]"
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute left-[2%] top-[50%] h-9 w-9 opacity-60"
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute left-[2%]top-[57%]h-9 w-9 opacity-60"
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute right-[6%] top-[57%] h-9 w-9 opacity-60"
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute right-[3%] top-[54%] h-9 w-9 opacity-60"
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute right-[4%] top-[59%] h-9 w-9 opacity-60"
                />
                <img
                    src="/star-orange.svg"
                    alt=""
                    className="absolute right-[4%] top-[18%] h-12 w-12 opacity-45"
                />
                <img
                    src="/star-gradient.svg"
                    alt=""
                    className="absolute right-[4%] bottom-[64%] h-10 w-10 opacity-55"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-114 top-4 h-16 w-16 opacity-85 drop-shadow-[0_18px_40px_rgba(0,0,0,0.18)] rotate-[8deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute left-112 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute left-112 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute left-182 top-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute left-152 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute left-162 top-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-172 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-152 top-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-112 top-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-112 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-12 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-132 top-4 h-12 w-12  drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-122 top-4 h-12 w-12 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute left-12 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[12deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-152 bottom-9 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[62deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-122 bottom-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[62deg]"
                />
                <img
                    src="/pipa.png"
                    alt=""
                    className="absolute right-112 top-4 h-12 w-12 opacity-70 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] -rotate-[62deg]"
                />
                {/* ✅ add-ons: +10 losangos */}
                <img src="/losangle-blue.svg" alt="" className="absolute left-[2%]  top-[18%]  h-119  w-119  opacity-55 rotate-[10deg]" />
                <img src="/losangle-orange.svg" alt="" className="absolute left-[4%] top-[62%]  h-112 w-12 opacity-45 -rotate-[8deg]" />
                <img src="/losangle-blue.svg" alt="" className="absolute left-[2%] top-[110%]  h-118  w-118  opacity-50 rotate-[22deg]" />
                <img src="/losangle-orange.svg" alt="" className="absolute left-[2%] bottom-[68%] h-110 w-110 opacity-50 -rotate-[14deg]" />
                <img src="/losangle-blue.svg" alt="" className="absolute left-[4%] top-[130%]  h-114 w-114 opacity-35 rotate-[36deg]" />
                <img src="/losangle-orange.svg" alt="" className="absolute left-[2%] top-[74%]  h-9  w-9  opacity-45 rotate-[18deg]" />
                <img src="/losangle-blue.svg" alt="" className="absolute right-[0%] top-[44%]  h-110 w-10 opacity-45 -rotate-[20deg]" />
                <img src="/losangle-orange.svg" alt="" className="absolute right-[2%] top-[46%] h-14 w-14 opacity-30 rotate-[28deg]" />
                <img src="/losangle-blue.svg" alt="" className="absolute right-[2%] bottom-[50%] h-91 w-9 opacity-50 rotate-[12deg]" />
                <img src="/losangle-orange.svg" alt="" className="absolute right-[2%]  bottom-[52%] h-110 w-10 opacity-45 -rotate-[16deg]" />

                {/* ✅ add-ons: +10 estrelas */}
                <img src="/star-gradient.svg" alt="" className="absolute left-[56%]  top-[3%]  h-9  w-119  opacity-55 drop-shadow-[0_16px_30px_rgba(37,99,235,0.16)]" />
                <img src="/star-orange.svg"  alt="" className="absolute left-[58%] top-[2%]  h-8  w-8  opacity-55 drop-shadow-[0_16px_30px_rgba(249,115,22,0.14)] rotate-[14deg]" />
                <img src="/star-gradient.svg" alt="" className="absolute left-[52%] top-[2%] h-110 w-10 opacity-45 rotate-[-10deg]" />
                <img src="/star-orange.svg"  alt="" className="absolute left-[56%] top-[2%]  h-112 w-12 opacity-35 rotate-[20deg]" />
                <img src="/star-gradient.svg" alt="" className="absolute left-[48%] top-[2%]   h-9  w-119  opacity-50 rotate-[6deg]" />
                <img src="/star-orange.svg"  alt="" className="absolute left-[58%] bottom-[22%] h-110 w-10 opacity-45 -rotate-[18deg]" />
                <img src="/star-gradient.svg" alt="" className="absolute right-[26%] top-[134%] h-119  w-9  opacity-55 rotate-[12deg]" />
                <img src="/star-orange.svg"  alt="" className="absolute right-[14%] top-[118%] h-10 w-10 opacity-50 -rotate-[8deg]" />
                <img src="/star-gradient.svg" alt="" className="absolute right-[10%] bottom-[40%] h-112 w-12 opacity-35 rotate-[16deg]" />
                <img src="/star-orange.svg"  alt="" className="absolute right-[6%]  bottom-[22%] h-9  w-9  opacity-55 -rotate-[14deg]" />

                {/* ✅ add-ons: +10 pipas */}
                <img src="/pipa.png" alt="" className="absolute right-[1%] top-[1%]  h-12 w-12 opacity-65 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] rotate-[18deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[50%] top-[1%]  h-12 w-12 opacity-65 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] rotate-[18deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[2%] top-[44%]  h-10 w-10 opacity-55 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[24deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[3%] top-[18%]  h-9  w-9  opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[32deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[2%] top-[40%]  h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[10deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[4%] top-[28%]  h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[46deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[2%] bottom-[12%] h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[38deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[4%] top-[54%] h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[14deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[2%] top-[10%] h-12 w-12 opacity-55 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[20deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[6%] bottom-[18%] h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[28deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[8%]  top-[42%]  h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[52deg]" />
                {/* ✅ add-ons: +10 pipas */}
                <img src="/pipa.png" alt="" className="absolute left-[1%] top-[26%]  h-12 w-12 opacity-65 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] rotate-[18deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[0%] top-[44%]  h-10 w-10 opacity-55 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[24deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[0%] top-[48%]  h-9  w-9  opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[32deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[2%] top-[60%]  h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[10deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[4%] top-[128%]  h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[46deg]" />
                <img src="/pipa.png" alt="" className="absolute left-[2%] bottom-[42%] h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[38deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[4%] top-[24%] h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[14deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[2%] top-[10%] h-12 w-12 opacity-55 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[20deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[6%] bottom-[18%] h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[28deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[8%]  top-[52%]  h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[52deg]" />

                <img src="/pipa.png" alt="" className="absolute right-[1%] top-[26%]  h-12 w-12 opacity-65 drop-shadow-[0_18px_40px_rgba(0,0,0,0.14)] rotate-[18deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[0%] top-[44%]  h-10 w-10 opacity-55 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[24deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[0%] top-[48%]  h-9  w-9  opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[32deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[2%] top-[60%]  h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[10deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[4%] top-[128%]  h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[46deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[2%] bottom-[42%] h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[38deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[4%] top-[24%] h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[14deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[2%] top-[10%] h-12 w-12 opacity-55 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[20deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[6%] bottom-[18%] h-10 w-10 opacity-60 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] rotate-[28deg]" />
                <img src="/pipa.png" alt="" className="absolute right-[8%]  top-[52%]  h-12 w-12 opacity-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] -rotate-[52deg]" />




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
                            "bg-transparent",
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
                            "bg-yellow-100",
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

