'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/app/components/shell/PageHeader';
import SectionBlock from '@/app/components/shared/SectionBlock';
import OutfitDetailModal from '@/app/components/search/OutfitDetailModal';
import SearchOutfitCard from '@/app/components/search/SearchOutfitCard';
import SearchUserCard from '@/app/components/search/SearchUserCard';
import { useDiscoverySearch } from '@/app/components/shell/DiscoverySearchContext';
import { OutfitCardData, buildOutfitDescriptionFallback, buildOutfitDescriptionRich } from '@/app/lib/outfit-card';

type SlotKey = 'upper' | 'lower' | 'shoes' | 'accessory';
type PublicScheme = {
  scheme_id: string;
  title: string;
  style: string;
  occasion: string;
  user_id: string;
  cover_image_url: string | null;
  // description may be a JSON string containing { outfitBackground, ... } when saved from Background Studio
  description?: string | null;
  pieces?: SchemePieceSnapshot[];
};

type SchemePieceSnapshot = {
  id: string;
  slot: SlotKey;
  sourceType: 'wardrobe' | 'suggested';
  sourceId: string;
  name: string;
  brand: string;
  category: 'Premium' | 'Standard' | 'Limited Edition' | 'Rare';
  pieceType: string;
  wearstyles: string[];
};

type UserPreview = { user_id: string; name: string; username: string; descriptor: string; avatarUrl?: string };

const SLOT_PREVIEW_DEFAULTS: Record<
  SlotKey,
  { pieceType: string; category: 'Premium' | 'Standard' | 'Limited Edition' | 'Rare'; wearstyles: string[] }
> = {
  upper: { pieceType: 'Jacket', category: 'Premium', wearstyles: ['Statement Piece', 'Visual Anchor'] },
  lower: { pieceType: 'Pants', category: 'Standard', wearstyles: ['Base Structure', 'Balanced Fit'] },
  shoes: { pieceType: 'Footwear', category: 'Rare', wearstyles: ['Trend Driver', 'Street Energy'] },
  accessory: { pieceType: 'Accessory', category: 'Limited Edition', wearstyles: ['Style Accent', 'Attention Grabber'] },
};

type OutfitFilter = 'all' | 'favorites' | 'available' | 'unavailable';

const OUTFIT_FILTER_TABS: Array<{ key: OutfitFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'favorites', label: 'Favoritos' },
  { key: 'available', label: 'Disponíveis' },
  { key: 'unavailable', label: 'Indisponíveis' },
];

export default function SearchItemsView() {
  const router = useRouter();
  const { query, debouncedQuery, setQuery } = useDiscoverySearch();
  const [schemes, setSchemes] = useState<PublicScheme[]>([]);
  const [users, setUsers] = useState<UserPreview[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitCardData | null>(null);
  const [outfitFilter, setOutfitFilter] = useState<OutfitFilter>('all');
  const [outfitFavorites, setOutfitFavorites] = useState<Record<string, boolean>>({});
  const [outfitAvailability, setOutfitAvailability] = useState<Record<string, 'available' | 'unavailable'>>({});

  useEffect(() => {
    fetch('/api/schemes/public')
      .then((res) => res.json())
      .then((data) => setSchemes(Array.isArray(data) ? data : []))
      .catch(() => setSchemes([]));

    fetch('/api/users/public')
      .then((res) => res.json())
      .then((payload) => setUsers(Array.isArray(payload?.users) ? payload.users : []))
      .catch(() => setUsers([]));
  }, []);

  const queryNorm = debouncedQuery.trim().toLowerCase();

  const outfitsById = useMemo(() => {
    const map: Record<string, OutfitCardData> = {};

    schemes.forEach((scheme) => {
      const pieces = (scheme.pieces ?? []).map((piece) => ({
        id: piece.id,
        name: piece.name || 'Selected piece',
        brand: piece.brand || 'Selection Brand',
        pieceType: piece.pieceType || SLOT_PREVIEW_DEFAULTS[piece.slot].pieceType,
        category: piece.category || SLOT_PREVIEW_DEFAULTS[piece.slot].category,
        wearstyles: piece.wearstyles?.length ? piece.wearstyles : SLOT_PREVIEW_DEFAULTS[piece.slot].wearstyles,
      }));

      const brands = [...new Set(pieces.map((piece) => piece.brand).filter(Boolean))].slice(0, 4);

      map[scheme.scheme_id] = {
        outfitName: scheme.title || 'Untitled Outfit',
        outfitStyleLine: `${scheme.style || 'Streetwear'} • ${scheme.occasion || 'General'}`,
        outfitDescription: scheme.description
          ? buildOutfitDescriptionRich({
              outfitName: scheme.title,
              style: scheme.style,
              occasion: scheme.occasion,
              pieces,
            })
          : buildOutfitDescriptionFallback({
              pieces,
              outfitStyleLine: `${scheme.style || 'Streetwear'} ${scheme.occasion || 'General'}`,
              outfitName: scheme.title || 'Untitled Outfit',
            }),
        heroImageUrl: scheme.cover_image_url || '/welcome-newcomers.png',
        outfitBackground: (() => {
          try {
            const parsed = JSON.parse(scheme.description || '{}') as { outfitBackground?: OutfitCardData['outfitBackground'] };
            return parsed?.outfitBackground;
          } catch {
            return undefined;
          }
        })(),
        pieces,
        brands,
        schemeId: scheme.scheme_id,
        creatorId: scheme.user_id,
        metaBadges: [
          { label: scheme.style || 'Style', icon: '🎯' },
          { label: scheme.occasion || 'Occasion', icon: '📍' },
          { label: `${pieces.length} pieces`, icon: '🧩' },
        ],
      };
    });

    return map;
  }, [schemes]);

  const groupedSearch = useMemo(() => {
    const filteredUsers = users.filter((user) => {
      if (!queryNorm) return true;
      const blob = `${user.name} ${user.username} ${user.descriptor}`.toLowerCase();
      return blob.includes(queryNorm);
    });

    const textFiltered = schemes.filter((scheme) => {
      if (!queryNorm) return true;
      const card = outfitsById[scheme.scheme_id];
      const brands = card?.brands?.join(' ') ?? '';
      const pieceNames = card?.pieces?.map((piece) => `${piece.name} ${piece.pieceType}`).join(' ') ?? '';
      const blob = `${scheme.title} ${scheme.style} ${scheme.occasion} ${scheme.description ?? ''} ${brands} ${pieceNames}`.toLowerCase();
      return blob.includes(queryNorm);
    });

    // Apply local filter tab
    const outfits = textFiltered.filter((scheme) => {
      if (outfitFilter === 'favorites') return outfitFavorites[scheme.scheme_id];
      if (outfitFilter === 'available') return (outfitAvailability[scheme.scheme_id] ?? 'available') === 'available';
      if (outfitFilter === 'unavailable') return outfitAvailability[scheme.scheme_id] === 'unavailable';
      return true;
    });

    return { users: filteredUsers, outfits, brands: [], wardrobeItems: [], styles: [] };
  }, [outfitsById, queryNorm, schemes, users, outfitFilter, outfitFavorites, outfitAvailability]);

  return (
    <div className="space-y-6">
      <PageHeader title="Buscar" subtitle="Hub de descoberta interativa de usuários, looks, marcas, estilos e roupas." />

      <SectionBlock title="Busca Global" subtitle="Busque usuários, looks, marcas, estilos e roupas.">
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque looks, marcas, estilos ou roupas"
            className="w-full bg-transparent text-white placeholder:text-white/60 focus:outline-none"
          />
        </label>
      </SectionBlock>

      <SectionBlock title={`Usuários (${groupedSearch.users.length})`} subtitle="Perfis que correspondem à busca.">
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {groupedSearch.users.map((user) => (
            <SearchUserCard
              key={user.user_id}
              name={user.name}
              username={user.username}
              descriptor={user.descriptor}
              avatarUrl={user.avatarUrl}
              onOpenProfile={() => router.push(`/profile/${user.user_id}?section=user-info`)}
            />
          ))}
          {!groupedSearch.users.length ? <p className="text-sm text-white/70">Nenhum usuário encontrado.</p> : null}
        </div>
      </SectionBlock>

      <SectionBlock title={`Looks (${groupedSearch.outfits.length})`} subtitle="Looks públicos no modo compacto de Cards de Look.">
        {/* Filter pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {OUTFIT_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setOutfitFilter(tab.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                outfitFilter === tab.key
                  ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.18)]'
                  : 'border-white/20 bg-white/5 text-white/65 hover:border-white/35 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupedSearch.outfits.map((scheme) => {
            const cardData = outfitsById[scheme.scheme_id];
            if (!cardData) return null;

            return (
              <div key={scheme.scheme_id} className="space-y-2">
                <SearchOutfitCard data={cardData} onOpenDetail={() => setSelectedOutfit(cardData)} />
                <div className="flex flex-wrap gap-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => setOutfitFavorites((prev) => ({ ...prev, [scheme.scheme_id]: !prev[scheme.scheme_id] }))}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${outfitFavorites[scheme.scheme_id] ? 'border-amber-300/50 bg-amber-500/20 text-amber-100' : 'border-white/25 text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    ★ Favorito
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutfitAvailability((prev) => ({ ...prev, [scheme.scheme_id]: 'available' }))}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${(outfitAvailability[scheme.scheme_id] ?? 'available') === 'available' ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-100' : 'border-white/25 text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    Disponível
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutfitAvailability((prev) => ({ ...prev, [scheme.scheme_id]: 'unavailable' }))}
                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${outfitAvailability[scheme.scheme_id] === 'unavailable' ? 'border-rose-300/50 bg-rose-500/20 text-rose-100' : 'border-white/25 text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                    Indisponível
                  </button>
                </div>
              </div>
            );
          })}
          {!groupedSearch.outfits.length ? (
            <p className="text-sm text-white/70">
              {outfitFilter === 'favorites' && 'Nenhum look favoritado ainda.'}
              {outfitFilter === 'available' && 'Nenhum look disponível.'}
              {outfitFilter === 'unavailable' && 'Nenhum look indisponível.'}
              {outfitFilter === 'all' && 'Nenhum look encontrado.'}
            </p>
          ) : null}
        </div>
      </SectionBlock>

      <SectionBlock title="Grupos de Descoberta" subtitle="Resultados organizados para marcas, roupas e estilos.">
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/75">
          <span className="rounded-full border border-white/25 px-2 py-1">Marcas: {groupedSearch.brands.length}</span>
          <span className="rounded-full border border-white/25 px-2 py-1">Roupas: {groupedSearch.wardrobeItems.length}</span>
          <span className="rounded-full border border-white/25 px-2 py-1">Estilos: {groupedSearch.styles.length}</span>
        </div>
      </SectionBlock>

      <OutfitDetailModal open={Boolean(selectedOutfit)} data={selectedOutfit} onClose={() => setSelectedOutfit(null)} />
    </div>
  );
}
