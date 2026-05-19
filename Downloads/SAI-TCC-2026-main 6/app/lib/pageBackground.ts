import { getLS, setLS } from '@/app/lib/SafeStorage';

export type PageBackgroundShape = 'none' | 'orb' | 'diamond' | 'mesh';

export interface PageBackgroundConfig {
  gradient: string;
  shape: PageBackgroundShape;
}
export interface SurfaceColorConfig {
  color: string;
}

const PAGE_BACKGROUND_KEY = 'sai_page_background_config';
const SURFACE_COLOR_KEY = 'sai_surface_color_config';
export const DEFAULT_SHELL_BACKGROUND_IMAGE = '/Fart.png';
export const GOLDEN_BACKGROUND_ASSET = '/Firefly_Consegue adicionar quebras de linha tech ao gradiente (adicionar ranhuras) 3787887.jpg';
export const OFFICIAL_WEBSITE_BACKGROUND_GRADIENT = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000'>
    <defs>
      <linearGradient id='base' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#f973c9'/>
        <stop offset='26%' stop-color='#a855f7'/>
        <stop offset='58%' stop-color='#7c3aed'/>
        <stop offset='100%' stop-color='#f59e0b'/>
      </linearGradient>
      <radialGradient id='glowA' cx='25%' cy='20%' r='60%'>
        <stop offset='0%' stop-color='rgba(255,224,138,0.85)'/>
        <stop offset='100%' stop-color='rgba(255,224,138,0)'/>
      </radialGradient>
      <radialGradient id='glowB' cx='72%' cy='28%' r='62%'>
        <stop offset='0%' stop-color='rgba(96,165,250,0.68)'/>
        <stop offset='100%' stop-color='rgba(96,165,250,0)'/>
      </radialGradient>
    </defs>
    <rect width='1600' height='1000' fill='url(#base)'/>
    <path d='M0,540 C220,430 420,650 650,560 C860,485 980,360 1250,420 C1420,458 1530,580 1600,660 L1600,1000 L0,1000 Z' fill='rgba(255,118,117,0.45)'/>
    <path d='M0,280 C210,170 410,380 650,300 C870,230 1030,80 1290,135 C1425,165 1525,255 1600,330 L1600,620 C1500,515 1380,440 1210,430 C970,416 830,532 600,600 C360,670 170,505 0,600 Z' fill='rgba(147,197,253,0.32)'/>
    <rect width='1600' height='1000' fill='url(#glowA)'/>
    <rect width='1600' height='1000' fill='url(#glowB)'/>
  </svg>`,
)}")`;
export const GOLDEN_WEBSITE_BACKGROUND_GRADIENT = [
  'linear-gradient(132deg, rgba(8, 6, 2, 0.82) 0%, rgba(42, 25, 7, 0.78) 38%, rgba(12, 10, 7, 0.9) 100%)',
  'linear-gradient(118deg, rgba(255, 214, 120, 0.3) 0%, rgba(240, 180, 66, 0.16) 44%, rgba(52, 33, 11, 0.48) 100%)',
  'repeating-linear-gradient(-20deg, rgba(255, 233, 172, 0.14) 0 1px, rgba(17, 12, 4, 0) 1px 18px)',
  'repeating-linear-gradient(88deg, rgba(252, 221, 149, 0.08) 0 2px, rgba(28, 18, 6, 0) 2px 26px)',
  `url("${GOLDEN_BACKGROUND_ASSET}")`,
].join(', ');

export const DEFAULT_PAGE_BACKGROUND_CONFIG: PageBackgroundConfig = {
  gradient: [
    'radial-gradient(circle at 14% 14%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.04) 44%)',
    'radial-gradient(circle at 84% 10%, rgba(191, 172, 255, 0.24) 0%, rgba(191, 172, 255, 0) 45%)',
    'linear-gradient(130deg, rgba(235, 226, 255, 0.42) 0%, rgba(255, 214, 226, 0.34) 40%, rgba(206, 225, 255, 0.3) 72%, rgba(255, 234, 210, 0.26) 100%)',
    `url('${DEFAULT_SHELL_BACKGROUND_IMAGE}')`,
  ].join(', '),
  shape: 'orb',
};
export const DEFAULT_SURFACE_COLOR_CONFIG: SurfaceColorConfig = { color: '#1e293b' };

const withTechGrooves = (base: string, opacity = 0.1): string => [
  'linear-gradient(160deg, rgba(12, 10, 8, 0.74) 0%, rgba(22, 16, 8, 0.5) 58%, rgba(8, 6, 4, 0.82) 100%)',
  `repeating-linear-gradient(135deg, rgba(255, 240, 200, ${opacity}) 0 1px, rgba(10, 7, 3, 0) 1px 14px)`,
  `repeating-linear-gradient(95deg, rgba(241, 201, 120, ${Math.max(opacity - 0.04, 0.03)}) 0 2px, rgba(10, 7, 3, 0) 2px 24px)`,
  base,
].join(', ');

const isGoldenBackground = (gradient: string): boolean => gradient.includes(GOLDEN_BACKGROUND_ASSET);
const isOfficialBackground = (gradient: string): boolean => gradient.includes(DEFAULT_SHELL_BACKGROUND_IMAGE);
const withDefaultBackgroundFallback = (gradient: string): string =>
  gradient.includes(DEFAULT_SHELL_BACKGROUND_IMAGE) ? gradient : `${gradient}, url('${DEFAULT_SHELL_BACKGROUND_IMAGE}')`;

const normalizePageBackgroundConfig = (candidate?: Partial<PageBackgroundConfig> | null): PageBackgroundConfig => ({
  gradient: withDefaultBackgroundFallback(candidate?.gradient || DEFAULT_PAGE_BACKGROUND_CONFIG.gradient),
  shape: (candidate?.shape as PageBackgroundShape) || DEFAULT_PAGE_BACKGROUND_CONFIG.shape,
});

export const readPageBackgroundConfig = (): PageBackgroundConfig => {
  const raw = getLS(PAGE_BACKGROUND_KEY);
  if (!raw) return normalizePageBackgroundConfig(DEFAULT_PAGE_BACKGROUND_CONFIG);
  try {
    const parsed = JSON.parse(raw) as Partial<PageBackgroundConfig>;
    return normalizePageBackgroundConfig(parsed);
  } catch {
    return normalizePageBackgroundConfig(DEFAULT_PAGE_BACKGROUND_CONFIG);
  }
};

export const applyPageBackgroundConfig = (config: PageBackgroundConfig): void => {
  if (typeof document === 'undefined') return;
  const resolvedBackground = withDefaultBackgroundFallback(config.gradient);
  document.documentElement.style.setProperty('--home-shell-bg', resolvedBackground);
  document.documentElement.style.setProperty('--sidebar-gradient', withTechGrooves(resolvedBackground, isGoldenBackground(resolvedBackground) ? 0.16 : 0.09));
  document.documentElement.style.setProperty('--sidebar-gradient-soft', withTechGrooves(resolvedBackground, isGoldenBackground(resolvedBackground) ? 0.12 : 0.07));
  document.documentElement.style.setProperty('--drawer-surface-bg', withTechGrooves(resolvedBackground, isGoldenBackground(resolvedBackground) ? 0.2 : 0.08));
  document.documentElement.style.setProperty('--drawer-surface-border', isGoldenBackground(resolvedBackground) ? 'rgba(255, 220, 150, 0.5)' : 'rgba(255, 255, 255, 0.3)');
  document.documentElement.style.setProperty('--drawer-surface-shadow', isGoldenBackground(resolvedBackground) ? '0 22px 50px rgba(92, 54, 8, 0.55)' : '0 22px 50px rgba(12, 24, 18, 0.45)');
  document.documentElement.setAttribute('data-official-background', isOfficialBackground(resolvedBackground) ? 'true' : 'false');
  document.documentElement.setAttribute('data-home-shape', config.shape);
};

export const savePageBackgroundConfig = (config: PageBackgroundConfig): void => {
  const normalized = normalizePageBackgroundConfig(config);
  setLS(PAGE_BACKGROUND_KEY, JSON.stringify(normalized));
  applyPageBackgroundConfig(normalized);
};

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '').trim();
  const normalized = value.length === 3 ? value.split('').map((c) => `${c}${c}`).join('') : value.slice(0, 6);
  const int = Number.parseInt(normalized || '1e293b', 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

export const applySurfaceColorConfig = (config: SurfaceColorConfig): void => {
  if (typeof document === 'undefined') return;
  const [r, g, b] = hexToRgb(config.color || DEFAULT_SURFACE_COLOR_CONFIG.color);
  const gradient = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.72) 0%, rgba(${r}, ${g}, ${b}, 0.62) 46%, rgba(${r}, ${g}, ${b}, 0.55) 100%)`;
  document.documentElement.style.setProperty('--liquid-glass-gradient', gradient);
  document.documentElement.style.setProperty('--liquid-glass-border', `rgba(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)}, 0.34)`);
  document.documentElement.style.setProperty('--user-surface-solid', `rgb(${r}, ${g}, ${b})`);
};

export const readSurfaceColorConfig = (): SurfaceColorConfig => {
  const raw = getLS(SURFACE_COLOR_KEY);
  if (!raw) return DEFAULT_SURFACE_COLOR_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<SurfaceColorConfig>;
    return { color: parsed.color || DEFAULT_SURFACE_COLOR_CONFIG.color };
  } catch {
    return DEFAULT_SURFACE_COLOR_CONFIG;
  }
};

export const saveSurfaceColorConfig = (config: SurfaceColorConfig): void => {
  const normalized = { color: config.color || DEFAULT_SURFACE_COLOR_CONFIG.color };
  setLS(SURFACE_COLOR_KEY, JSON.stringify(normalized));
  applySurfaceColorConfig(normalized);
};

export const ensureSavedPageBackgroundConfig = (): PageBackgroundConfig => {
  const raw = getLS(PAGE_BACKGROUND_KEY);
  if (!raw) {
    savePageBackgroundConfig(DEFAULT_PAGE_BACKGROUND_CONFIG);
    return normalizePageBackgroundConfig(DEFAULT_PAGE_BACKGROUND_CONFIG);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PageBackgroundConfig>;
    const normalized = normalizePageBackgroundConfig(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      setLS(PAGE_BACKGROUND_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    savePageBackgroundConfig(DEFAULT_PAGE_BACKGROUND_CONFIG);
    return normalizePageBackgroundConfig(DEFAULT_PAGE_BACKGROUND_CONFIG);
  }
};
