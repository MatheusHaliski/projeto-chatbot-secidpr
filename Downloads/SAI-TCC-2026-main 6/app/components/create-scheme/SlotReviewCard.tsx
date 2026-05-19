interface SlotReviewCardProps {
  slot: string;
  icon: string;
  selected: string;
  status: 'filled' | 'empty';
}

export default function SlotReviewCard({ slot, icon, selected, status }: SlotReviewCardProps) {
  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold capitalize text-white">
          {icon} {slot}
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            status === 'filled' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
          }`}
        >
          {status === 'filled' ? 'Assigned' : 'Empty'}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/75">{selected}</p>
    </article>
  );
}
