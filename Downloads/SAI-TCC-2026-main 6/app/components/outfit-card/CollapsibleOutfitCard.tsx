'use client';

import { useMemo, useState } from 'react';
import OutfitCard from '@/app/components/outfit-card/OutfitCard';
import type { OutfitCardData } from '@/app/lib/outfit-card';

type FilterKey = 'favorites' | 'available' | 'unavailable';

interface CollapsibleOutfitCardProps {
  card: OutfitCardData;
  defaultExpanded?: boolean;
  showActions?: boolean;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onUseInDressTester?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

const isPortuguese = () => typeof window !== 'undefined' && (window.localStorage.getItem('sai-site-language') ?? 'pt').startsWith('pt');

export function getSchemeFilterValue(card: OutfitCardData, favorites: Record<string, boolean>, availability: Record<string, 'available' | 'unavailable'>): FilterKey {
  const id = card.schemeId ?? card.outfitName;
  if (favorites[id]) return 'favorites';
  return availability[id] ?? 'available';
}

export default function CollapsibleOutfitCard({
  card,
  defaultExpanded = false,
  showActions = true,
  onViewDetails,
  onEdit,
  onUseInDressTester,
  onDelete,
  onToggleFavorite,
}: CollapsibleOutfitCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const pt = isPortuguese();

  const actions = useMemo(
    () => showActions
      ? [
          { label: pt ? 'Ver detalhes' : 'View details', onClick: onViewDetails, tone: 'accent' as const },
          { label: pt ? 'Editar' : 'Edit', onClick: onEdit },
          { label: pt ? 'Usar no Provador 2D' : 'Use in Dress Tester', onClick: onUseInDressTester },
          { label: pt ? 'Favoritar' : 'Favorite', onClick: onToggleFavorite },
          { label: pt ? 'Excluir' : 'Delete', onClick: onDelete, tone: 'danger' as const },
        ]
      : undefined,
    [onDelete, onEdit, onToggleFavorite, onUseInDressTester, onViewDetails, pt, showActions],
  );

  return (
    <article className="space-y-2 rounded-2xl border border-white/20 bg-white/5 p-2">
      <div className="flex justify-end">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="rounded-lg border border-white/30 px-2 py-1 text-xs text-white/90">
          {expanded ? (pt ? 'Minimizar' : 'Minimize') : (pt ? 'Maximizar' : 'Maximize')}
        </button>
      </div>
      <OutfitCard data={card} variant={expanded ? 'default' : 'compact'} actions={actions} />
    </article>
  );
}
