'use client';

import { useMemo, useState } from 'react';
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

interface Scheme {
  scheme_id: string;
  title: string;
  style: string;
  occasion: string;
  description?: string | null;
  cover_image_url?: string | null;
  visibility: 'public' | 'private';
  creation_mode?: 'manual' | 'ai';
  updated_at?: string;
  pieces?: SchemePieceSnapshot[];
}

interface ProfileMySchemesSectionProps {
  userId: string;
  schemes: Scheme[];
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

const buildData = (scheme: Scheme): OutfitCardData => {
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
      { icon: scheme.creation_mode === 'ai' ? '✨' : '✍️', label: scheme.creation_mode === 'ai' ? 'AI' : 'Manual' },
      { icon: scheme.visibility === 'public' ? '🌐' : '🔒', label: scheme.visibility === 'public' ? 'Público' : 'Privado' },
      { icon: '🕒', label: scheme.updated_at ? new Date(scheme.updated_at).toLocaleDateString('pt-BR') : 'recente' },
    ],
    pieces,
  };
};

export default function ProfileMySchemesSection({ userId, schemes }: ProfileMySchemesSectionProps) {
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [exportingScheme, setExportingScheme] = useState<Scheme | null>(null);

  const cards = useMemo(() => schemes.map((scheme) => ({ scheme, data: buildData(scheme) })), [schemes]);

  return (
    <>
      <SectionBlock title="Meus Esquemas" subtitle="Cards de look criados por você com visualização premium compacta.">
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {cards.map(({ scheme, data }) => (
            <OutfitCard
              key={scheme.scheme_id}
              data={data}
              variant="compact"
              actions={[
                { label: 'Abrir', onClick: () => setSelectedScheme(scheme), tone: 'accent' },
                { label: 'Editar' },
                { label: 'Exportar', onClick: () => setExportingScheme(scheme), tone: 'accent' },
                { label: scheme.visibility === 'public' ? 'Despublicar' : 'Publicar' },
                { label: 'Excluir', tone: 'danger' },
              ]}
            />
          ))}
          {!cards.length ? <p className="text-sm text-white/80">Nenhum esquema criado ainda.</p> : null}
        </div>
      </SectionBlock>

      {selectedScheme ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{selectedScheme.title}</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setExportingScheme(selectedScheme)} className="rounded-lg border border-cyan-300/50 px-2 py-1 text-xs text-cyan-100">Export to Social</button>
                <button type="button" onClick={() => setSelectedScheme(null)} className="rounded-lg border border-white/30 px-2 py-1 text-xs text-white">Close</button>
              </div>
            </div>
            <p className="mt-2 text-sm text-white/75">View creator profile • Save/Favorite • Open in Dress Tester (next phase integration).</p>
            <div className="mt-4">
              <OutfitCard data={buildData(selectedScheme)} />
            </div>
          </div>
        </div>
      ) : null}

      {exportingScheme ? (
        <OutfitExportModal
          open={Boolean(exportingScheme)}
          onClose={() => setExportingScheme(null)}
          userId={userId}
          outfitId={exportingScheme.scheme_id}
          schemeId={exportingScheme.scheme_id}
          title={exportingScheme.title}
          sourceImageUrl={exportingScheme.cover_image_url || '/welcome-newcomers.png'}
          defaultCaption={`${exportingScheme.title} • ${exportingScheme.style} look built in SAI`}
        />
      ) : null}
    </>
  );
}
