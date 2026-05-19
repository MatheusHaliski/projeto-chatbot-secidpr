'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SearchInput from '../shared/SearchInput';
import TopbarActionIcon from '@/app/components/search/TopbarActionIcon';
import { NotificationsPanel, QuickNavDrawer, SystemInboxPanel, UserAccountDrawer } from '@/app/components/search/TopbarPanels';
import OpenAddPieceButton from '@/app/components/pieces/OpenAddPieceButton';
import { useDiscoverySearch } from '@/app/components/shell/DiscoverySearchContext';

interface TopBarProps {
  pageTitle: string;
  onOpenAddPiece: () => void;
}

const BellIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>);
const MailIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>);
const UserIcon = () => (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.2" /><path d="M5 19a7 7 0 0 1 14 0" /></svg>);
const MenuIcon = () => (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>);

export default function TopBar({ pageTitle, onOpenAddPiece }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { query, setQuery } = useDiscoverySearch();
  const [panel, setPanel] = useState<'notifications' | 'inbox' | 'menu' | 'account' | null>(null);
  const [isPortuguese, setIsPortuguese] = useState(false);

  const handleGlobalSearchSubmit = (rawValue: string) => {
    const value = rawValue.trim().toLowerCase();
    if (!value) return;
    if (value.includes('config') || value.includes('setting') || value.includes('configura')) return router.push('/profile/settings');
    if (value.includes('wardrobe') || value.includes('guarda')) return router.push('/my-wardrobe');
    return router.push('/search-items');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const refresh = () => setIsPortuguese(window.localStorage.getItem('sai-site-language') !== 'en');
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('sai-language-change', refresh as EventListener);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('sai-language-change', refresh as EventListener);
    };
  }, []);

  return (
    <>
      <header className="sa-surface-topbar sa-topbar-shell h-full w-full rounded-2xl border-8 border-orange-500 px-4 py-3 backdrop-blur-md lg:px-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><p className="sa-topbar-title truncate text-lg font-semibold text-white">{pageTitle}</p></div>
          <div className="hidden w-full max-w-xl lg:block">
            <SearchInput placeholder={isPortuguese ? 'Buscar looks, marcas, estilos ou peças do guarda-roupa' : 'Search outfits, brands, styles, or wardrobe items'} value={query} onChange={setQuery} onSubmit={handleGlobalSearchSubmit} />
          </div>
          <div className="flex items-center gap-2">
            <OpenAddPieceButton onClick={onOpenAddPiece} />
            <TopbarActionIcon label={isPortuguese ? 'Notificações' : 'Notifications'} icon={<BellIcon />} onClick={() => setPanel('notifications')} />
            <TopbarActionIcon label={isPortuguese ? 'Caixa do sistema' : 'System Inbox'} icon={<MailIcon />} onClick={() => setPanel('inbox')} />
            <TopbarActionIcon label={isPortuguese ? 'Navegação rápida' : 'Quick Navigation'} icon={<MenuIcon />} onClick={() => setPanel('menu')} />
            <TopbarActionIcon label={isPortuguese ? 'Conta' : 'Account'} icon={<UserIcon />} onClick={() => setPanel('account')} />
          </div>
        </div>
        <div className="mt-3 lg:hidden">
          <SearchInput placeholder={isPortuguese ? 'Buscar looks, marcas, estilos ou peças do guarda-roupa' : 'Search outfits, brands, styles, or wardrobe items'} value={query} onChange={setQuery} onSubmit={handleGlobalSearchSubmit} />
        </div>
      </header>
      {panel === 'notifications' ? <NotificationsPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'inbox' ? <SystemInboxPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'menu' ? <QuickNavDrawer onClose={() => setPanel(null)} activePath={pathname} /> : null}
      {panel === 'account' ? <UserAccountDrawer onClose={() => setPanel(null)} /> : null}
    </>
  );
}
