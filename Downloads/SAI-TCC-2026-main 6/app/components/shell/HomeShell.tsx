'use client';

import { useEffect, useState } from 'react';
import SidebarNav from './SidebarNav';
import TopBar from './TopBar';
import { DiscoverySearchProvider } from '@/app/components/shell/DiscoverySearchContext';
import ContentRouter from './ContentRouter';
import { AppRoute, NAV_ITEMS, PATH_TO_ROUTE, ROUTE_TITLES } from '@/app/lib/stylist-shell';
import { ensureSharedAccessToken } from '@/app/lib/accessTokenShare';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuthSessionToken } from '@/app/lib/authSession';
import AddPieceModal from '@/app/components/pieces/AddPieceModal';
import {
  applyPageBackgroundConfig,
  applySurfaceColorConfig,
  ensureSavedPageBackgroundConfig,
  readSurfaceColorConfig,
} from '@/app/lib/pageBackground';
import { applyTheme, readSavedTheme } from '@/app/lib/theme';

export default function HomeShell() {
  const pathname = usePathname();
  const currentRoute = PATH_TO_ROUTE[pathname]
    ?? (pathname.startsWith('/profile/') ? (pathname.endsWith('/settings') ? 'profile-settings' : 'profile') : 'my-wardrobe');
  const [activeRoute, setActiveRoute] = useState<AppRoute>(currentRoute);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const [addPieceModalOpen, setAddPieceModalOpen] = useState(false);
  const hasAccess = Boolean(ensureSharedAccessToken());

  useEffect(() => {
    setActiveRoute(currentRoute);
  }, [currentRoute]);

  useEffect(() => {
    const token = getAuthSessionToken();
    if (!token) {
      router.replace('/authview');
    }
  }, [hasAccess, router]);

  useEffect(() => {
    applyPageBackgroundConfig(ensureSavedPageBackgroundConfig());
    applySurfaceColorConfig(readSurfaceColorConfig());
    applyTheme(readSavedTheme());
  }, []);

  const token1 = getAuthSessionToken();
  if (!token1) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Checking access...</div>;
  }

  return (
    <div className="sa-home-shell flex min-h-screen text-[color:var(--shell-foreground)]">
      <SidebarNav
        activeRoute={activeRoute}
        onRouteChange={(route) => {
          setActiveRoute(route);
          const path = NAV_ITEMS.find((item) => item.route === route)?.path;
          if (path) router.push(path);
        }}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <DiscoverySearchProvider>
        <main className="flex min-w-0 min-h-[600px] flex-1 flex-col p-2">
          <div className="sticky top-0 z-30 flex w-full items-stretch gap-2">
            <div className="sa-home-logo-tile flex h-full w-24 shrink-0 items-center justify-center rounded-2xl border-8 border-orange-500 bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.25)] sm:w-28 lg:w-32">
              <Image src="/80A950EF-F93D-4C1B-89B8-17490D321F97_1_105_c.jpeg" alt="SAI" width={160} height={72} className="h-full w-full object-contain" priority />
            </div>

            <div className="min-w-0 flex-1">
              <TopBar pageTitle={ROUTE_TITLES[activeRoute]} onOpenAddPiece={() => setAddPieceModalOpen(true)} />
            </div>
          </div>

          <section className="flex-1 overflow-y-auto p-4 lg:p-6">
            <ContentRouter route={activeRoute} />
          </section>
        </main>
        <AddPieceModal open={addPieceModalOpen} onClose={() => setAddPieceModalOpen(false)} />
      </DiscoverySearchProvider>
    </div>
  );
}
