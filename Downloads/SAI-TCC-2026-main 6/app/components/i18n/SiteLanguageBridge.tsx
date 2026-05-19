'use client';

import { useEffect } from 'react';

const SITE_LANGUAGE_STORAGE_KEY = 'sai-site-language';

const PT_TRANSLATIONS: Record<string, string> = {
  // Navigation / Profile
  Profile: 'Perfil',
  'Creator Profile': 'Perfil do criador',
  Settings: 'Configurações',
  'Profile Menu': 'Menu do perfil',
  'My Wardrobe Pieces': 'Meu Guarda-roupa',
  'User Info': 'Informações do usuário',
  'My Schemes': 'Meus Esquemas',
  'Saved Schemes': 'Esquemas Salvos',
  'My Posts': 'Minhas postagens',
  'Active section:': 'Seção ativa:',
  Authenticated: 'Autenticado',
  'Public Profile': 'Perfil público',

  // Language / Settings
  'Site language': 'Idioma do site',
  'Current saved:': 'Idioma salvo:',
  Save: 'Salvar',
  Confirm: 'Confirmar',
  'Danger Zone': 'Zona de perigo',
  'Delete your account': 'Excluir sua conta',
  Logout: 'Sair',
  'Export account data': 'Exportar dados da conta',
  Privacy: 'Privacidade',
  Theme: 'Tema',
  Current: 'Atual',
  New: 'Nova',
  'Change Password': 'Alterar senha',
  'Dark enabled': 'Escuro ativado',
  'Dark disabled': 'Escuro desativado',
  Public: 'Público',
  Private: 'Privado',
  English: 'Inglês',
  'Visible to everyone': 'Visível para todos',
  'Only visible to you': 'Visível apenas para você',

  // Page titles / headers
  'Saved Outfit Cards': 'Cards de Look Salvos',
  'Manage outfits by occasion, preference, favorite, and availability.': 'Gerencie looks por ocasião, preferência, favoritos e disponibilidade.',
  Search: 'Buscar',
  'Interactive discovery hub for users, outfits, brands, styles, and wardrobe items.': 'Hub de descoberta interativa de usuários, looks, marcas, estilos e roupas.',
  'Virtual Wardrobe': 'Guarda-Roupa Virtual',
  'Classify pieces as available, unavailable, and favorites.': 'Classifique peças como disponíveis, indisponíveis e favoritas.',
  'Create Outfit Card': 'Criar Card de Look',
  'Background Studio': 'Estúdio de Fundo',
  'Dress Tester': 'Provador 2D',

  // Sections / filters
  Available: 'Disponíveis',
  Unavailable: 'Indisponíveis',
  Favorites: 'Favoritos',
  'Available Pieces': 'Peças Disponíveis',
  'Unavailable Pieces': 'Peças Indisponíveis',
  'Favorite Pieces': 'Peças Favoritas',

  // Outfit card actions
  'View details': 'Ver detalhes',
  Edit: 'Editar',
  'Use in Dress Tester': 'Usar no Provador 2D',
  'Add to Scheme': 'Adicionar ao Esquema',
  Delete: 'Excluir',
  Open: 'Abrir',
  Export: 'Exportar',
  Duplicate: 'Duplicar',
  Remove: 'Remover',
  Publish: 'Publicar',
  Unpublish: 'Despublicar',
  'Export to Social': 'Exportar para Redes Sociais',
  Favorite: 'Favorito',
  '★ Favorite': '★ Favorito',

  // Outfit status
  'Status:': 'Status:',
  'Favorite:': 'Favorito:',
  available: 'disponível',
  unavailable: 'indisponível',
  yes: 'sim',
  no: 'não',

  // Wardrobe section
  'Scan and manage your pieces with premium compact cards.': 'Visualize e gerencie suas peças com cards premium compactos.',
  'No wardrobe items found yet.': 'Nenhuma peça encontrada ainda.',
  'No pieces in this list.': 'Nenhuma peça nesta lista.',
  'Manage list status for each wardrobe item.': 'Gerencie o status de cada peça do guarda-roupa.',

  // Search page
  'Global Search': 'Busca Global',
  'Search users, outfits, brands, styles, wearstyles, and wardrobe items.': 'Busque usuários, looks, marcas, estilos e roupas.',
  'Search outfits, brands, styles, or wardrobe items': 'Busque looks, marcas, estilos ou roupas',
  'No users found.': 'Nenhum usuário encontrado.',
  'No outfits found.': 'Nenhum look encontrado.',
  'Expandable Discovery Groups': 'Grupos de Descoberta',
  'Structured results model is ready for Brands, Wardrobe Items, and Styles.': 'Resultados organizados para marcas, roupas e estilos.',
  'Public outfits in compact Saved Outfit Cards card mode.': 'Looks públicos no modo compacto de Cards de Look.',

  // Explore/Saved section
  'Outfits grouped by occasion.': 'Looks agrupados por ocasião.',
  'No authored schemes yet.': 'Nenhum esquema criado ainda.',
  'No saved schemes available.': 'Nenhum esquema salvo disponível.',
  'Authored creative assets with compact premium outfit cards.': 'Cards de look criados por você com visualização premium compacta.',
  'Compact Saved Outfit Cards card family with premium visual continuity.': 'Cards de look salvos com continuidade visual premium.',
  'Saved outfit card with editable social-ready metadata.': 'Card de look salvo com metadados editáveis para redes sociais.',
  'Creator scheme ready for editing and publishing.': 'Esquema criador pronto para edição e publicação.',

  // Profile summary
  'Premium creator hub for wardrobe, schemes, publishing, and account controls.': 'Hub premium para guarda-roupa, esquemas, publicação e controles de conta.',
  'Public creator profile view.': 'Visualização pública do perfil do criador.',

  // Buttons/loading
  Close: 'Fechar',
  Cancel: 'Cancelar',
  'Load more': 'Carregar mais',
  Loading: 'Carregando',
  'Loading…': 'Carregando…',
  'AI Search': 'Busca IA',
  Searching: 'Buscando',
  'Searching...': 'Buscando...',

  // Modal / confirmation
  'Are you sure?': 'Tem certeza?',
  'This action cannot be undone.': 'Esta ação não pode ser desfeita.',
  'Confirm delete': 'Confirmar exclusão',

  // Misc badges
  AI: 'IA',
  Manual: 'Manual',
  recent: 'recente',
  'Ready for 3D Viewer': 'Pronto para o Visualizador 3D',
  'Queue pending': 'Na fila',
  'Generating asset': 'Gerando ativo',
  'Failed (tap to retry)': 'Falhou (toque para tentar novamente)',

  // Section labels
  Occasion: 'Ocasião',
  Style: 'Estilo',
  pieces: 'peças',

  // Filter pills (new)
  Disponíveis: 'Disponíveis',
  Indisponíveis: 'Indisponíveis',
  Favoritos: 'Favoritos',
};

const reverseTranslations = Object.entries(PT_TRANSLATIONS).reduce<Record<string, string>>((acc, [en, pt]) => {
  acc[pt] = en;
  return acc;
}, {});

const translateTextNodes = (root: ParentNode, toPt: boolean): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const dict = toPt ? PT_TRANSLATIONS : reverseTranslations;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const raw = node.nodeValue;
    if (!raw) continue;

    const normalized = raw.trim();
    if (!normalized) continue;

    const translated = dict[normalized];
    if (!translated) continue;

    node.nodeValue = raw.replace(normalized, translated);
  }
};

const translateAttributes = (root: ParentNode, toPt: boolean): void => {
  const dict = toPt ? PT_TRANSLATIONS : reverseTranslations;
  const elements = (root as Element).querySelectorAll?.('*');
  if (!elements) return;

  elements.forEach((el) => {
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && dict[placeholder]) el.setAttribute('placeholder', dict[placeholder]);

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && dict[ariaLabel]) el.setAttribute('aria-label', dict[ariaLabel]);

    if (el instanceof HTMLOptionElement) {
      const content = el.textContent?.trim();
      if (content && dict[content]) el.textContent = dict[content];
    }
  });
};

export default function SiteLanguageBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyLanguage = () => {
      const isPt = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY) !== 'en';
      document.documentElement.setAttribute('lang', isPt ? 'pt-BR' : 'en');
      translateTextNodes(document.body, isPt);
      translateAttributes(document.body, isPt);
    };

    applyLanguage();

    const observerOptions: MutationObserverInit = { childList: true, subtree: true };

    const observer = new MutationObserver(() => {
      observer.disconnect();
      applyLanguage();
      observer.observe(document.body, observerOptions);
    });
    observer.observe(document.body, observerOptions);

    const onStorage = (event: StorageEvent) => {
      if (event.key === SITE_LANGUAGE_STORAGE_KEY) applyLanguage();
    };

    window.addEventListener('storage', onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
