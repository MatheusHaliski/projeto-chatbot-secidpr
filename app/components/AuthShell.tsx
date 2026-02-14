import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  description?: string;
  children: ReactNode;
  extraDecorations?: ReactNode;
};

const GLOW_BAR =
  "bg-gradient-to-r border-amber-300 border-8 from-cyan-500 via-teal-400 to-emerald-500 shadow-[0_14px_45px_rgba(16,185,129,0.25)]";

const GLOW_LINE =
  "relative after:content-[''] after:absolute after:left-6 after:right-6 after:-bottom-2 after:h-[10px] after:rounded-full " +
  "after:bg-gradient-to-r after:from-cyan-400/40 after:via-teal-300/40 after:to-emerald-400/40 after:blur-xl";

export default function AuthShell({
  title,
  subtitle,
  description,
  children,
  extraDecorations,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen fe-form-material px-4 py-10 sm:px-8">
      {/* Optional decorations behind everything */}
      {extraDecorations ? (
        <div className="pointer-events-none absolute inset-0 z-0">
          {extraDecorations}
        </div>
      ) : null}

      {/* Left badge */}
      <div className="absolute left-4 sm:left-10 lg:left-16 top-6 z-20">
        <div
          className={[
            "rounded-2xl px-4 py-3 w-fit border-4 border-yellow-100 bg-white text-amber-500",
            "h-44 sm:h-42 md:h-46 lg:h-48",
            GLOW_LINE,
            "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-4">
            <img
              src="/A1BCBA00-AE79-42DB-A9F9-E4633086EF24.png"
              alt="DineExplorer"
              className="h-12 sm:h-14 w-auto object-contain"
            />
            <div className="hidden sm:block font-sharetech leading-tight">
              <div className="text-xs font-semibold tracking-[0.22em] text-orange-600 uppercase">
                Dine Explorer
              </div>
              <div className="text-sm font-semibold text-amber-500">
                {/* opcional: tagline curta */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right badge */}
      <div className="absolute right-4 sm:right-10 lg:right-16 top-6 z-20">
        <div
          className={[
            "rounded-2xl px-4 py-3 w-fit  border-4 border-yellow-100 bg-white text-amber-500",
            "h-44 sm:h-42 md:h-46 lg:h-48",
            GLOW_LINE,
            "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-4">
            <img
              src="/VI.jpeg"
              alt="Velion"
              className="h-12 sm:h-14 w-auto object-contain"
            />
            <div className="hidden sm:block font-sharetech leading-tight">
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
            "relative flex w-full max-w-5xl flex-col items-center gap-10 px-6 py-10",
            "lg:flex-row lg:items-start lg:justify-between",
            "rounded-3xl",
            GLOW_BAR,
            GLOW_LINE,
            "border-amber-300 border-4",
            "bg-white bg-cover bg-center bg-no-repeat",
          ].join(" ")}
        >
          {/* FORM CONTAINER */}
          <div
            className={[
              "w-full space-y-6 rounded-3xl p-6 sm:p-8",
              "border-amber-300 border-4",
              "bg-white bg-cover bg-center bg-no-repeat",
              "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            {/* Header block */}
            <div
              className={[
                "rounded-2xl w-full bg-white text-amber-500 px-4 py-4 sm:px-8 sm:py-5",
                GLOW_LINE,
                "border-amber-300 border-4",
                "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
              ].join(" ")}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <img
                  src="/A1BCBA00-AE79-42DB-A9F9-E4633086EF24.png"
                  alt="DineExplorer"
                  className={[
                    "w-full max-w-[720px] object-contain",
                    "h-64 sm:h-62 md:h-66 lg:h-68",
                  ].join(" ")}
                />

                <div className="hidden sm:block font-sharetech leading-tight">
                  <div className="text-base sm:text-lg md:text-xl font-semibold tracking-[0.22em] text-orange-500 uppercase text-center">
                    Find your favorite places at a glance.
                  </div>
                </div>
              </div>
            </div>

            {/* Title card */}
            <div
              className={[
                "space-y-4 rounded-3xl p-6 sm:p-8 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
                "border-amber-300 border-8",
              ].join(" ")}
            >
              <p className="text-xs font-semibold font-sharetech uppercase tracking-[0.35em] text-orange-600">
                {title}
              </p>

              <h1 className="text-3xl font-semibold text-orange-600">
                {subtitle}
              </h1>

              {description ? (
                <p className="text-lg sm:text-xl font-medium text-orange-600 leading-relaxed">
                  {description}
                </p>
              ) : null}
            </div>

            {/* children */}
            <div className="mt-6 w-full space-y-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
