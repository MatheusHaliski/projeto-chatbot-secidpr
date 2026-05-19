export type SaiTheme = 'dark' | 'light';

export const SAI_THEME_KEY = 'sai_theme';

export const readSavedTheme = (): SaiTheme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(SAI_THEME_KEY);
  return saved === 'light' ? 'light' : 'dark';
};

export const applyTheme = (theme: SaiTheme): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(SAI_THEME_KEY, theme);
};
