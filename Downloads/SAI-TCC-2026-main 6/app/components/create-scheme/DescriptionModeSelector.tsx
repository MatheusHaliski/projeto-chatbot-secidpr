type DescriptionMode = 'ai' | 'manual' | 'none';

interface DescriptionModeSelectorProps {
  value: DescriptionMode;
  onChange: (next: DescriptionMode) => void;
}

const MODES: Array<{ value: DescriptionMode; label: string; icon: string; helper: string }> = [
  { value: 'ai', label: 'AI Description', icon: '✨', helper: 'Rotating premium AI copy' },
  { value: 'manual', label: 'Manual Description', icon: '✍️', helper: 'Write your own tone' },
  { value: 'none', label: 'No Description', icon: '🫥', helper: 'Header-only presentation' },
];

export default function DescriptionModeSelector({ value, onChange }: DescriptionModeSelectorProps) {
  return (
    <div className="space-y-2 md:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Description mode</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              value === mode.value
                ? 'border-violet-300/80 bg-violet-500/25 shadow-[0_0_24px_rgba(139,92,246,0.25)]'
                : 'border-white/20 bg-white/10 hover:bg-white/15'
            }`}
          >
            <p className="text-sm font-semibold text-white">
              <span className="mr-1.5">{mode.icon}</span>
              {mode.label}
            </p>
            <p className="text-xs text-white/65">{mode.helper}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
