'use client';

import { AppRoute, NAV_ITEMS } from '@/app/lib/stylist-shell';
import SidebarNavItem from './SidebarNavItem';

interface SidebarNavProps {
  activeRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function NavContent({
  activeRoute,
  onRouteChange,
}: Pick<SidebarNavProps, 'activeRoute' | 'onRouteChange'>) {
  return (
    <div className="flex h-full flex-col gap-4 p-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="sa-sidebar-heading text-lg font-semibold text-white">Fashion Dashboard</h1>
      </div>

      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.route}
            route={item.route}
            label={item.label}
            helperText={item.helperText}
            active={activeRoute === item.route}
            compact={false}
            onSelect={onRouteChange}
          />
        ))}
      </nav>
    </div>
  );
}

export default function SidebarNav({
  activeRoute,
  onRouteChange,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  return mobileOpen ? (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={onCloseMobile}>
      <aside
        className="sa-premium-gradient-surface sa-surface-sidebar h-full w-72 border-r border-white/25 backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <NavContent
          activeRoute={activeRoute}
          onRouteChange={(route) => {
            onRouteChange(route);
            onCloseMobile();
          }}
        />
      </aside>
    </div>
  ) : null;
}
