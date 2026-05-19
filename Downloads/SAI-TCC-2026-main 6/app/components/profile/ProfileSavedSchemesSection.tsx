'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionBlock from '@/app/components/shared/SectionBlock';
import OutfitCard from '@/app/components/outfit-card/OutfitCard';
import OutfitExportModal from '@/app/components/profile/OutfitExportModal';
import { OutfitCardData, OutfitBackgroundConfig } from '@/app/lib/outfit-card';

interface SchemePieceSnapshot {
  id?: string;
  piece_id?: string;
  name?: string;
  piece_name?: string;
  brand?: string;
  brand_name?: string;
  brandLogoUrl?: string;
  brand_logo_url?: string;
  pieceType?: string;
  piece_type?: string;
  category?: 'Premium' | 'Standard' | 'Limited Edition' | 'Rare';
  wearstyles?: string[];
}

interface SavedScheme {
  scheme_id: string;
  title: string;
  style: string;
  occasion: string;
  description?: string | null;
  cover_image_url?: string | null;
  visibility: 'public' | 'private';
  pieces?: SchemePieceSnapshot[];
}

interface ProfileSavedSchemesSectionProps {
  userId: string;
}

// Parses outfitBackground from the scheme.description JSON field (same logic as ExploreSchemeView)
function parseBackground(description?: string | null): OutfitBackgroundConfig | undefined {
  if (!description) return undefined;
  try {
    const parsed = JSON.parse(description) as { outfitBackground?: OutfitBackgroundConfig };
    return parsed?.outfitBackground ?? undefined;
  } catch {
    return undefined;
  }
}

const toData = (scheme: SavedScheme): OutfitCardData => {
  const pieces = Array.isArray(scheme.pieces)
    ? scheme.pieces.map((piece, index) => ({
        id: piece.id ?? piece.piece_id ?? `${scheme.scheme_id}-piece-${index}`,
        name: piece.name ?? piece.piece_name ?? 'Selected piece',
        brand: piece.brand ?? piece.brand_name ?? 'Brand',
        brandLogoUrl: piece.brandLogoUrl ?? piece.brand_logo_url,
        pieceType: piece.pieceType ?? piece.piece_type ?? 'Garment',
        category: piece.category,
        wearstyles: piece.wearstyles,
      }))
    : [];

  return {
    outfitName: scheme.title,
    outfitStyleLine: `${scheme.style} · ${scheme.occasion}`,
    outfitDescription: undefined, // let OutfitCard build fallback from pieces
    heroImageUrl: scheme.cover_image_url || '/welcome-newcomers.png',
    outfitBackground: parseBackground(scheme.description),
    metaBadges: [
      { icon: '💾', label: 'Salvo' },
      { icon: scheme.visibility === 'public' ? '🌐' : '🔒', label: scheme.visibility === 'public' ? 'Público' : 'Privado' },
    ],
    pieces,
  };
};

export default function ProfileSavedSchemesSection({ userId }: ProfileSavedSchemesSectionProps) {
  const [exportingScheme, setExportingScheme] = useState<SavedScheme | null>(null);
  // Schemes favorited from other users' public cards, fetched via the outfit_favorites collection
  const [favoriteSchemes, setFavoriteSchemes] = useState<SavedScheme[] | null>(null);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!userId) {
        setFavoriteSchemes([]);
        return;
      }
      const favoritesResponse = await fetch(`/api/outfit-favorites?userId=${encodeURIComponent(userId)}`);
      const favoritesPayload = await favoritesResponse.json().catch(() => ({ favorites: [] }));
      const favoriteIds = Array.isArray(favoritesPayload?.favorites)
        ? (favoritesPayload.favorites as { schemeId?: string }[]).map((entry) => entry.schemeId).filter(Boolean)
        : [];
      if (!favoriteIds.length) {
        setFavoriteSchemes([]);
        return;
      }

      const publicResponse = await fetch('/api/schemes/public');
      const publicSchemes = await publicResponse.json().catch(() => []);
      const onlyFavorites = Array.isArray(publicSchemes)
        ? (publicSchemes as SavedScheme[]).filter((scheme) => (favoriteIds as string[]).includes(scheme.scheme_id))
        : [];
      setFavoriteSchemes(onlyFavorites);
    };

    loadFavorites().catch(() => setFavoriteSchemes([]));
  }, [userId]);

  // Show loading state until favorites are resolved; then show only actual saved (favorited) cards
  const cards = useMemo(() => {
    if (favoriteSchemes === null) return null; // still loading
    return favoriteSchemes.map((scheme) => ({ scheme, data: toData(scheme) }));
  }, [favoriteSchemes]);

  return (
    <>
      <SectionBlock title="Esquemas Salvos" subtitle="Cards de look salvos dos outros criadores da comunidade.">
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {cards === null ? (
            <p className="text-sm text-white/60">Carregando esquemas salvos…</p>
          ) : cards.length ? (
            cards.map(({ scheme, data }) => (
              <OutfitCard
                key={scheme.scheme_id}
                data={data}
                variant="compact"
                actions={[
                  { label: 'Abrir', tone: 'accent' },
                  { label: 'Editar' },
                  { label: 'Exportar', onClick: () => setExportingScheme(scheme), tone: 'accent' },
                  { label: 'Duplicar' },
                  { label: 'Remover', tone: 'danger' },
                ]}
              />
            ))
          ) : (
            <p className="text-sm text-white/80">Nenhum esquema salvo ainda. Favorite cards públicos para vê-los aqui.</p>
          )}
        </div>
      </SectionBlock>

      {exportingScheme ? (
        <OutfitExportModal
          open={Boolean(exportingScheme)}
          onClose={() => setExportingScheme(null)}
          userId={userId}
          outfitId={exportingScheme.scheme_id}
          schemeId={exportingScheme.scheme_id}
          title={exportingScheme.title}
          sourceImageUrl={exportingScheme.cover_image_url || '/welcome-newcomers.png'}
          defaultCaption={`${exportingScheme.title} from my Saved Looks in SAI`}
        />
      ) : null}
    </>
  );
}
