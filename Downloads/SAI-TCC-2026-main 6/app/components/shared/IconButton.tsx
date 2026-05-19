import { ReactNode } from 'react';

interface IconButtonProps {
  label: string;
  icon: ReactNode;
}

export default function IconButton({ label, icon }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="sa-premium-gradient-surface-soft inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 text-white shadow-sm transition hover:border-white/50"
    >
      <span className="text-sm">{icon}</span>
    </button>
  );
}
