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

export default function AuthShell2({
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
      <div className="absolute left-4 top-6 z-20 sm:left-10 lg:left-16">
        <div
          className={[
            "flex h-24 w-44 items-center justify-center rounded-2xl border-4 border-yellow-100 bg-white px-3 py-2 text-amber-500 sm:h-28 sm:w-52",
            GLOW_LINE,
            "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
          ].join(" ")}
        >
          <div className="flex h-full w-full items-center justify-center">
            <img
              src="/1E8AEB0C-78BC-42FD-9113-73F1A0728A3A_1_105_c.jpeg"
              alt="DineExplorer"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Right badge */}
      <div className="absolute right-4 top-6 z-20 sm:right-10 lg:right-16">
        <div
          className={[
            "flex h-24 w-44 items-center justify-center rounded-2xl border-4 border-yellow-100 bg-white px-3 py-2 text-amber-500 sm:h-28 sm:w-52",
            GLOW_LINE,
            "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
          ].join(" ")}
        >
          <div className="flex h-full w-full items-center justify-center">
            <img
              src="/VI.jpeg"
              alt="Velion"
              className="h-full w-full object-contain"
            />
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
                "w-full rounded-2xl bg-white px-4 py-4 text-amber-500 sm:px-8 sm:py-5",
                GLOW_LINE,
                "border-amber-300 border-4",
                "shadow-[0_18px_60px_rgba(0,0,0,0.25)]",
              ].join(" ")}
            >
              <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
                <div className="flex flex-col items-center justify-center gap-3">
                  <img
                    src="/1E8AEB0C-78BC-42FD-9113-73F1A0728A3A_1_105_c.jpeg"
                    alt="DineExplorer"
                    className="h-64 w-full max-w-[720px] object-contain sm:h-62 md:h-66 lg:h-68"
                  />

                  <div className="hidden font-sharetech leading-tight sm:block">
                    <div className="text-center font-sharetech text-2xl font-bold uppercase tracking-[0.22em] text-orange-500 sm:text-5xl md:text-6xl">
                      DINE EXPLORER
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <div className="overflow-hidden rounded-2xl border-4 border-amber-300 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
                    <img
                      src="/4D13F57F-2101-40AC-888C-D2DF836E3286.png"
                      alt="Dine Explorer featured visual"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Title card */}
            <div
              className={[
                "space-y-4 rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-8",
                "border-amber-300 border-8",
              ].join(" ")}
            >
              <p className="text-center text-base font-semibold uppercase tracking-[0.22em] text-orange-500 sm:text-lg md:text-xl">
                {title}
              </p>

              <h1 className="text-center text-base font-semibold uppercase tracking-[0.22em] text-orange-500 sm:text-lg md:text-xl">
                {subtitle}
              </h1>

              {description ? (
                <p className="text-center text-base font-semibold uppercase tracking-[0.22em] text-orange-500 sm:text-lg md:text-xl">
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
