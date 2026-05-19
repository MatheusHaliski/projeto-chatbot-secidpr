// src/app/gate/uiTokens.ts
export const GLASS = "border border-white/20 bg-white/10";

export const GLASS_DEEP = "border border-white/18 bg-white/8 backdrop-blur-2xl";

export const FILTER_GLOW_BAR =
    "bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_12px_40px_rgba(124,58,237,0.18)]";

export const FILTER_GLOW_LINE =
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-[radial-gradient(800px_200px_at_50%_0%,rgba(124,58,237,0.35),transparent_55%)]";

export const GLOW_BAR =
    "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 " +
    "shadow-[0_14px_45px_rgba(16,185,129,0.25)]";

export const GLOW_LINE =
    "after:content-[''] after:absolute after:left-6 after:right-6 after:-bottom-2 " +
    "after:h-[10px] after:rounded-full after:bg-gradient-to-r after:from-cyan-400/40 after:via-teal-300/40 after:to-emerald-400/40 " +
    "after:blur-xl";

export const TEXT_GLOW =
    "text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.25)]";

// (opcional) tokens mais usados no teu projeto
export const GLASS_PANEL =
    "relative rounded-3xl border border-white/15 bg-white/[0.08] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]";

export const GLASS_INPUT =
    "h-12 w-full rounded-2xl border border-white/14 bg-white/[0.08] backdrop-blur-2xl px-3 text-white placeholder:text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35";

export const CARD_GLASS =
    "rounded-3xl border border-white/14 bg-white/[0.08] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.30)]";

export const INPUT_GLASS =
    "w-full rounded-2xl border border-white/18 bg-white/80 px-4 py-3 text-slate-900 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300/35";