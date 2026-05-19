'use client';

import ContextSectionMenu from '@/app/components/navigation/ContextSectionMenu';
import { ProfileSectionKey } from '@/app/components/profile/types';
import { useEffect, useState } from 'react';

interface ProfileContextMenuProps {
  selectedSection: ProfileSectionKey;
  onSelectSection: (section: ProfileSectionKey) => void;
  allowedSections?: ProfileSectionKey[];
}

const sectionConfig: Array<{ key: ProfileSectionKey; label: string }> = [
  { key: 'wardrobe', label: 'My Wardrobe Pieces' },
  { key: 'user-info', label: 'User Info' },
  { key: 'my-schemes', label: 'My Schemes' },
  { key: 'saved-schemes', label: 'Saved Schemes' },
  { key: 'my-posts', label: 'My Posts' },
  { key: 'settings', label: 'Settings' },
];

export default function ProfileContextMenu({ selectedSection, onSelectSection, allowedSections }: ProfileContextMenuProps) {
  const [isPortuguese, setIsPortuguese] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setIsPortuguese(window.localStorage.getItem('sai-site-language') !== 'en');
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('sai-language-change', refresh as EventListener);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('sai-language-change', refresh as EventListener);
    };
  }, []);

  const localizedConfig = sectionConfig.map((item) => ({
    ...item,
    label: isPortuguese
      ? ({ wardrobe: 'Meu Guarda-roupa', 'user-info': 'Informações do usuário', 'my-schemes': 'Meus esquemas', 'saved-schemes': 'Esquemas salvos', 'my-posts': 'Minhas postagens', settings: 'Configurações' }[item.key])
      : item.label,
  }));
  const filteredConfig = allowedSections?.length
    ? localizedConfig.filter((item) => allowedSections.includes(item.key))
    : localizedConfig;

  const selectedLabel = filteredConfig.find((item) => item.key === selectedSection)?.label ?? filteredConfig[0]?.label ?? 'User Info';

  return (
    <ContextSectionMenu
      title={isPortuguese ? 'Menu do perfil' : 'Profile Menu'}
      sections={filteredConfig.map((item) => item.label)}
      selectedSection={selectedLabel}
      onSelectSection={(label) => {
        const section = filteredConfig.find((item) => item.label === label);
        if (section) onSelectSection(section.key);
      }}
    />
  );
}
