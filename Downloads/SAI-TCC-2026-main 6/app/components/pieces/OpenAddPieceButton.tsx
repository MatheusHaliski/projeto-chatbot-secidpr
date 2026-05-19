'use client';

interface OpenAddPieceButtonProps {
  onClick: () => void;
}

export default function OpenAddPieceButton({ onClick }: OpenAddPieceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/40 bg-gradient-to-r from-violet-600/70 to-fuchsia-600/70 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(168,85,247,0.35)] transition hover:-translate-y-0.5 hover:brightness-110"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-white/15 text-xs">+</span>
      <span className="hidden sm:inline">Add Piece</span>
    </button>
  );
}
