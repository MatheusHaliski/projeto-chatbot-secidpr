interface CompactCardActionBarProps {
  actions: Array<{
    label: string;
    onClick?: () => void;
    tone?: 'default' | 'danger' | 'accent';
  }>;
}

export default function CompactCardActionBar({ actions }: CompactCardActionBarProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
            action.tone === 'danger'
              ? 'border-rose-300/50 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
              : action.tone === 'accent'
                ? 'border-cyan-300/60 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20'
                : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
