'use client';

import { ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_PAGE_BACKGROUND_CONFIG,
  PageBackgroundConfig,
  PageBackgroundShape,
  readPageBackgroundConfig,
  applySurfaceColorConfig,
  readSurfaceColorConfig,
  saveSurfaceColorConfig,
  savePageBackgroundConfig,
} from '@/app/lib/pageBackground';
import { clearAuthSessionProfile, clearAuthSessionToken, getAuthSessionProfile } from '@/app/lib/authSession';
import { clearSharedAccessToken } from '@/app/lib/accessTokenShare';
import { applyTheme, readSavedTheme } from '@/app/lib/theme';
import { useEffect } from 'react';

function Overlay({ onClose }: { onClose: () => void }) {
  return <button type="button" aria-label="Close panel" className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={onClose} />;
}

function RightDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <Overlay onClose={onClose} />
      <aside className="sa-right-drawer sa-liquid-glass-token fixed right-0 top-0 z-[80] h-full w-full max-w-sm border-l p-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white/70">{title}</p>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/30 px-2 py-1 text-xs">✕</button>
        </div>
        <div className="space-y-2">{children}</div>
      </aside>
    </>
  );
}

function PageBackgroundStudio({
  draft,
  surfaceColor,
  isPortuguese,
  onChange,
  onApply,
  onSurfaceColorChange,
}: {
  draft: PageBackgroundConfig;
  surfaceColor: string;
  isPortuguese: boolean;
  onChange: (next: PageBackgroundConfig) => void;
  onApply: (next: PageBackgroundConfig) => void;
  onSurfaceColorChange: (next: string) => void;
}) {
  const gradients = [
    'linear-gradient(135deg, #0b7a4a 0%, #075e39 45%, #05311f 100%)',
    'linear-gradient(145deg, #0f9f67 0%, #0b6147 55%, #022c22 100%)',
    'linear-gradient(130deg, #1d976c 0%, #0f7a52 50%, #023326 100%)',
    'linear-gradient(135deg, #4338ca 0%, #1d4ed8 48%, #0891b2 100%)',
    'linear-gradient(140deg, #be185d 0%, #9333ea 45%, #4f46e5 100%)',
    'linear-gradient(130deg, #ea580c 0%, #f59e0b 42%, #facc15 100%)',
  ];
  const shapes: PageBackgroundShape[] = ['none', 'orb', 'diamond', 'mesh'];
  const officialConfig: PageBackgroundConfig = {
    gradient: DEFAULT_PAGE_BACKGROUND_CONFIG.gradient,
    shape: DEFAULT_PAGE_BACKGROUND_CONFIG.shape,
  };
  return (
    <div className="sa-page-studio space-y-3 rounded-xl border border-emerald-100/30 bg-emerald-950/40 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-emerald-100/80">{isPortuguese ? 'Estúdio de fundo' : 'Page Background Studio'}</p>
      <div className="grid grid-cols-3 gap-2">
        {gradients.map((gradient) => (
          <button
            key={gradient}
            type="button"
            onClick={() => onChange({ ...draft, gradient })}
            className={`h-14 rounded-lg border ${draft.gradient === gradient ? 'border-emerald-200' : 'border-white/20'}`}
            style={{ background: gradient }}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {shapes.map((shape) => (
          <button
            key={shape}
            type="button"
            onClick={() => onChange({ ...draft, shape })}
            className={`sa-shape-chip rounded-lg border px-2 py-1 text-xs uppercase ${draft.shape === shape ? 'border-emerald-200 bg-emerald-500/30' : 'border-white/20 bg-white/10'}`}
          >
            {shape}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="w-full overflow-hidden rounded-lg border border-white/30 bg-white/10 text-left"
        onClick={() => {
          onChange(officialConfig);
          onApply(officialConfig);
        }}
      >
        {isPortuguese ? 'Restaurar oficial' : 'Reset to official'}
      </button>
      <label className="block rounded-lg border border-white/20 bg-white/10 p-2 text-xs">
        {isPortuguese ? 'Cor das divs' : 'Div color'}
        <input
          type="color"
          value={surfaceColor}
          onChange={(event) => onSurfaceColorChange(event.target.value)}
          className="mt-2 h-9 w-full cursor-pointer rounded border border-white/25 bg-transparent"
        />
      </label>
    </div>
  );
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const notifications = [
    'Outfit liked by @alicefits',
    'AI generation completed for “Urban Layers”',
    'Wardrobe item processed successfully',
  ];

  return (
    <RightDrawer title="Notifications" onClose={onClose}>
      {notifications.map((item) => (
        <article key={item} className="sa-liquid-glass-token rounded-xl border border-white/15 bg-white/10 p-3 text-sm">{item}</article>
      ))}
    </RightDrawer>
  );
}

export function SystemInboxPanel({ onClose }: { onClose: () => void }) {
  const updates = [
    { title: 'AI-generated outfit ready', summary: 'Your “Night Neon” render is now available.', level: 'info' },
    { title: 'Asset validation complete', summary: '2D mannequin asset passed quality validation.', level: 'success' },
  ];

  return (
    <RightDrawer title="System Inbox" onClose={onClose}>
      {updates.map((item) => (
        <article key={item.title} className="sa-liquid-glass-token rounded-xl border border-white/15 bg-white/10 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{item.title}</p>
            <span className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] uppercase">{item.level}</span>
          </div>
          <p className="text-xs text-white/70">{item.summary}</p>
        </article>
      ))}
    </RightDrawer>
  );
}

export function QuickNavDrawer({ onClose, activePath }: { onClose: () => void; activePath: string }) {
  const [isPortuguese, setIsPortuguese] = useState(false);
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
  const links = [
    { href: '/explore-scheme', label: isPortuguese ? 'Cards salvos de look' : 'Saved Outfit Cards' },
    { href: '/create-my-scheme', label: isPortuguese ? 'Criar meu card de look' : 'Create my Outfit Card' },
    { href: '/dress-tester', label: isPortuguese ? 'Provador virtual' : 'Dress Tester' },
    { href: '/search-items', label: isPortuguese ? 'Buscar' : 'Search' },
    { href: '/search-pieces', label: isPortuguese ? 'Buscar peças' : 'Search Pieces' },
    { href: '/my-wardrobe', label: isPortuguese ? 'Meu Guarda-roupa' : 'My Wardrobe Pieces' },
    { href: '/profile', label: isPortuguese ? 'Configurações' : 'Settings' },
  ];

  return (
    <RightDrawer title={isPortuguese ? 'Navegação rápida' : 'Quick Navigation'} onClose={onClose}>
      {links.map((link) => (
        <Link
          key={`${link.href}-${link.label}`}
          href={link.href}
          onClick={onClose}
          className={`sa-liquid-glass-token block rounded-xl border px-3 py-2 text-sm transition ${activePath === link.href ? 'border-cyan-300/60 bg-cyan-400/15' : 'border-white/15 bg-white/8 hover:bg-white/15'}`}
        >
          {link.label}
        </Link>
      ))}
    </RightDrawer>
  );
}

export function UserAccountDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [liquidMode, setLiquidMode] = useState<boolean>(readSavedTheme() === 'light');
  const [isPortuguese, setIsPortuguese] = useState(false);
  const [backgroundDraft, setBackgroundDraft] = useState<PageBackgroundConfig>(() => readPageBackgroundConfig());
  const [surfaceColor, setSurfaceColor] = useState<string>(() => readSurfaceColorConfig().color);
  useEffect(() => {
    applySurfaceColorConfig({ color: surfaceColor });
  }, [surfaceColor]);
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

  const profile = useMemo(() => getAuthSessionProfile(), []);
  const userId = profile.user_id?.trim() || '';
  const username = profile.name?.trim() || 'SAI User';
  const email = profile.email?.trim() || 'user@sai.app';
  const photoUrl = profile.photo_url?.trim() || '';

  const setTheme = (isLight: boolean) => {
    setLiquidMode(isLight);
    applyTheme(isLight ? 'light' : 'dark');
  };

  const handleLogout = () => {
    clearSharedAccessToken();
    clearAuthSessionToken();
    clearAuthSessionProfile();
    onClose();
    router.replace('/authview');
  };

  const actionItems = [
    { label: isPortuguese ? 'Ver perfil' : 'View Profile', icon: '👤', onClick: () => { onClose(); router.push(userId ? `/profile/${userId}` : '/profile'); } },
    { label: liquidMode ? (isPortuguese ? 'Modo líquido: Ativo' : 'Liquid Mode: On') : (isPortuguese ? 'Modo líquido: Inativo' : 'Liquid Mode: Off'), icon: '💧', onClick: () => setTheme(!liquidMode) },
    { label: isPortuguese ? 'Configurações da conta' : 'Account Settings', icon: '⚙️', onClick: () => { onClose(); router.push('/profile?section=settings'); } },
    { label: isPortuguese ? 'Sair' : 'Logout', icon: '🚪', onClick: handleLogout },
  ];

  return (
    <RightDrawer title={isPortuguese ? 'Conta' : 'Account'} onClose={onClose}>
      <article className="sa-drawer-card sa-liquid-glass-token rounded-xl border border-emerald-100/30 bg-white/10 p-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-emerald-100/40 bg-emerald-950/40">
            {photoUrl ? (
              <Image src={photoUrl} alt={`${username} avatar`} width={48} height={48} className="h-full w-full object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-emerald-100">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{username}</p>
            <p className="truncate text-xs text-emerald-50/80">@{email.split('@')[0]} · {email}</p>
          </div>
        </div>
      </article>
      <div className="space-y-2">
        {actionItems.map((action) => (
          <button key={action.label} type="button" onClick={action.onClick} className="sa-drawer-action sa-liquid-glass-token w-full rounded-xl border border-emerald-100/30 bg-white/10 px-3 py-2 text-left text-sm">
            <span className="flex items-center gap-2">
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </span>
          </button>
        ))}
      </div>
      <PageBackgroundStudio
        draft={backgroundDraft}
        surfaceColor={surfaceColor}
        isPortuguese={isPortuguese}
        onChange={(next) => {
          setBackgroundDraft(next);
          savePageBackgroundConfig(next);
        }}
        onApply={(next) => {
          setBackgroundDraft(next);
          savePageBackgroundConfig(next);
        }}
        onSurfaceColorChange={(next) => {
          setSurfaceColor(next);
          saveSurfaceColorConfig({ color: next });
        }}
      />
    </RightDrawer>
  );
}
