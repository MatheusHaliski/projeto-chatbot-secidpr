import { ReactNode } from 'react';

export type SemanticTone = {
  gradient: string;
  border: string;
  glow: string;
  text: string;
};

interface SemanticGlowBadgeProps {
  label: string;
  tone: SemanticTone;
  icon?: ReactNode;
  compact?: boolean;
}

export default function SemanticGlowBadge({ label, tone, icon, compact = false }: SemanticGlowBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-semibold tracking-[0.08em] backdrop-blur-md transition hover:brightness-110 ${tone.border} ${tone.text} ${tone.glow}`}
      style={{ backgroundImage: tone.gradient }}
    >
      {icon ? <span className="opacity-90">{icon}</span> : null}
      <span>{label}</span>
    </span>
  );
}
