'use client';

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  showDebug: boolean;
  onToggleDebug: () => void;
}

export default function Tester2DControls({ zoom, onZoomIn, onZoomOut, onReset, showDebug, onToggleDebug }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onZoomOut}
        className="rounded-xl border border-white/25 px-3 py-2 text-xs font-semibold text-white"
      >
        − Zoom
      </button>
      <span className="text-xs text-white/60 tabular-nums">{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        onClick={onZoomIn}
        className="rounded-xl border border-white/25 px-3 py-2 text-xs font-semibold text-white"
      >
        + Zoom
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border border-white/25 px-3 py-2 text-xs font-semibold text-white"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onToggleDebug}
        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${showDebug ? 'border-fuchsia-400/60 bg-fuchsia-400/20 text-fuchsia-100' : 'border-white/25 text-white'}`}
      >
        Debug
      </button>
    </div>
  );
}
