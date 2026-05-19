import { ReactNode } from 'react';

interface TopbarActionIconProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

export default function TopbarActionIcon({ label, icon, onClick }: TopbarActionIconProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="sa-premium-gradient-surface-soft sa-topbar-action inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 text-white shadow-sm transition hover:border-white/50"
    >
      <span className="text-sm">{icon}</span>
    </button>
  );
}
