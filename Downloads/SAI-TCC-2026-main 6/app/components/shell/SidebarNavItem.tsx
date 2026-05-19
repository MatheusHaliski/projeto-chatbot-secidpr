import { AppRoute } from '@/app/lib/stylist-shell';

interface SidebarNavItemProps {
  route: AppRoute;
  label: string;
  helperText: string;
  active: boolean;
  compact: boolean;
  onSelect: (route: AppRoute) => void;
}



const RouteIcon = ({ route }: { route: AppRoute }) => {
  if (route === 'my-wardrobe') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (route === 'search-items') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" />
      </svg>
    );
  }

  if (route === 'search-pieces') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" />
        <path d="M4 19h16" />
      </svg>
    );
  }
  if (route === 'create-my-scheme') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (route === 'explore-scheme') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
};

export default function SidebarNavItem({ route, label, helperText, active, compact, onSelect }: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(route)}
      className={`sa-sidebar-nav-item group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
        active
          ? 'border-emerald-100/70 bg-[linear-gradient(120deg,rgba(34,197,94,0.7),rgba(250,204,21,0.7))] text-slate-900 shadow-[0_0_28px_rgba(250,204,21,0.35)]'
          : 'sa-premium-gradient-surface-soft border-transparent text-white/85 hover:border-white/30 hover:text-white'
      }`}
    >
      <span className="sa-premium-gradient-surface-soft inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm">
        <RouteIcon route={route} />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{label}</span>
          <span className={`sa-sidebar-nav-helper block truncate text-xs ${active ? 'text-black/70' : 'text-white/55'}`}>{helperText}</span>
        </span>
      ) : null}
    </button>
  );
}
