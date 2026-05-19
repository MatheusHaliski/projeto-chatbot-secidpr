'use client';

import { useEffect, useState } from 'react';
import SectionBlock from '@/app/components/shared/SectionBlock';
import DangerZoneCard from '@/app/components/profile/DangerZoneCard';
import { applyTheme, readSavedTheme, type SaiTheme } from '@/app/lib/theme';
import FancySelect from '@/app/components/ui/fancy-select';

const LEGACY_DARK_MODE_STORAGE_KEY = 'sai-dark-mode-enabled';
const SITE_LANGUAGE_STORAGE_KEY = 'sai-site-language';

type SiteLanguage = 'en' | 'pt-BR';

const applySiteLanguage = (language: SiteLanguage): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
  document.documentElement.setAttribute('lang', language);
  window.dispatchEvent(new Event('sai-language-change'));
};

const readSavedSiteLanguage = (): SiteLanguage => {
  if (typeof window === 'undefined') return 'pt-BR';
  const storedLanguage = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
  return storedLanguage === 'en' ? 'en' : 'pt-BR';
};

export default function ProfileSettingsSection() {
  const [theme, setTheme] = useState<SaiTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const legacyDarkModeEnabled = window.localStorage.getItem(LEGACY_DARK_MODE_STORAGE_KEY) === 'true';
    if (legacyDarkModeEnabled) return 'dark';
    return readSavedTheme();
  });
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [siteLanguage, setSiteLanguage] = useState<SiteLanguage>(readSavedSiteLanguage);
  const [savedLanguage, setSavedLanguage] = useState<SiteLanguage>(readSavedSiteLanguage);
  const [languageStatus, setLanguageStatus] = useState<string>('');
  const darkMode = theme === 'dark';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const legacyDarkModeEnabled = window.localStorage.getItem(LEGACY_DARK_MODE_STORAGE_KEY) === 'true';
    if (legacyDarkModeEnabled) {
      applyTheme('dark');
    }
    document.documentElement.classList.remove('dark-mode');
    window.localStorage.removeItem(LEGACY_DARK_MODE_STORAGE_KEY);
  }, []);

  const toggleDarkMode = () => {
    const nextTheme: SaiTheme = darkMode ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const saveLanguagePreference = () => {
    applySiteLanguage(siteLanguage);
    setSavedLanguage(siteLanguage);
    setLanguageStatus(siteLanguage === 'pt-BR' ? 'Idioma salvo: Português (Brasil).' : 'Language saved: English.');
  };

  return (
    <SectionBlock title="Settings" subtitle="Manage account, security, privacy, and preference controls.">
      <div className="mt-4 space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4">
        <h4 className="text-sm font-semibold text-white">Change Password</h4>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="password" placeholder="Current" className="rounded-xl border border-white/25 bg-black/20 px-3 py-2 text-sm text-white" />
          <input type="password" placeholder="New" className="rounded-xl border border-white/25 bg-black/20 px-3 py-2 text-sm text-white" />
          <button type="button" className="rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-500/45 to-cyan-500/45 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]">
            Confirm
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="rounded-2xl border border-white/20 bg-white/10 p-3 text-sm text-white">Theme
          <button type="button" onClick={toggleDarkMode} className="ml-2 rounded-lg border border-white/30 px-2 py-1 text-xs">{darkMode ? 'Dark enabled' : 'Dark disabled'}</button>
        </label>
        <label className="rounded-2xl border border-white/20 bg-white/10 p-3 text-sm text-white">Privacy
          <div className="mt-2">
            <FancySelect
              value={privacy}
              onChange={(value) => setPrivacy(value as 'public' | 'private')}
              options={[
                { value: 'public', label: 'Public', hint: 'Visible to everyone' },
                { value: 'private', label: 'Private', hint: 'Only visible to you' },
              ]}
            />
          </div>
        </label>
      </div>
      <div className="mt-3 rounded-2xl border border-emerald-200/45 bg-emerald-500/10 p-3 text-sm text-white">
        <label className="flex flex-wrap items-center gap-2 font-medium">Site language
          <div className="min-w-[220px]">
            <FancySelect
              value={siteLanguage}
              onChange={(value) => setSiteLanguage(value as SiteLanguage)}
              options={[
                { value: 'pt-BR', label: 'Português (Brasil)', hint: 'Interface em português' },
                { value: 'en', label: 'English', hint: 'English interface' },
              ]}
            />
          </div>
          <span className="text-xs font-normal text-white/75">Select the interface language.</span>
        </label>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-sm text-white">
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-white/70">{siteLanguage === 'pt-BR' ? 'Idioma salvo atual:' : 'Current saved:'} {savedLanguage === 'pt-BR' ? 'Português (Brasil)' : 'English'}</p>
            <button type="button" onClick={saveLanguagePreference} className="rounded-lg border border-emerald-200/70 bg-emerald-500/25 px-2 py-1 text-[11px] font-semibold">
              Salvar
            </button>
          </div>
          {languageStatus ? <p className="mt-2 text-[11px] text-emerald-100">{languageStatus}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white">Export data</button>
        <button type="button" className="rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white">Logout</button>
      </div>
      <div className="mt-4">
        <DangerZoneCard />
      </div>
    </SectionBlock>
  );
}
