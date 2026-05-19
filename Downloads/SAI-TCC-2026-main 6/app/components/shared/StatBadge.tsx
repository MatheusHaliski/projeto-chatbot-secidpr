interface StatBadgeProps {
  label: string;
  value: string;
}

export default function StatBadge({ label, value }: StatBadgeProps) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center">
      <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
