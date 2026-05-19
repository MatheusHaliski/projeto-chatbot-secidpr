import { ReactNode } from 'react';

interface SectionBlockProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SectionBlock({ title, subtitle, action, children, className }: SectionBlockProps) {
  return (
    <section
      className={`sa-surface-header overflow-visible rounded-3xl border-8 border-white p-5 shadow-lg backdrop-blur-sm ${className ?? ''}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle ? <p className="text-sm text-white/60">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
