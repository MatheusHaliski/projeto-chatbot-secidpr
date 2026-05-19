interface SaveSummaryPanelProps {
  mode: 'manual' | 'ai';
  descriptionMode: 'ai' | 'manual' | 'none';
  filledSlots: number;
  totalSlots: number;
}

export default function SaveSummaryPanel({ mode, descriptionMode, filledSlots, totalSlots }: SaveSummaryPanelProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-white/20 bg-white/10 p-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Generation</p>
        <p className="mt-1 text-sm font-semibold text-white">{mode === 'manual' ? 'Manual Builder' : 'AI Builder'}</p>
      </div>
      <div className="rounded-xl border border-white/20 bg-white/10 p-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Description</p>
        <p className="mt-1 text-sm font-semibold text-white">{descriptionMode.toUpperCase()}</p>
      </div>
      <div className="rounded-xl border border-white/20 bg-white/10 p-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Slots</p>
        <p className="mt-1 text-sm font-semibold text-white">{filledSlots}/{totalSlots} filled</p>
      </div>
    </div>
  );
}
