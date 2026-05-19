import { OutfitPiece, resolveBrandLogoUrlByName } from '@/app/lib/outfit-card';
import WearstyleChips from '@/app/components/outfit-card/WearstyleChips';
import VisualToken from '@/app/components/outfit-card/VisualToken';
import BrandBadge from '@/app/components/outfit-card/BrandBadge';
import { FILTER_GLOW_LINE, GLOW_LINE, TEXT_GLOW } from '@/app/lib/uiToken';

interface OutfitPieceCardProps {
  piece: OutfitPiece;
  compact?: boolean;
}

export default function OutfitPieceCard({ piece, compact = false }: OutfitPieceCardProps) {
  const pieceName = piece.name?.trim() || 'Unnamed Piece';
  const brandName = piece.brand?.trim() || 'Brand not specified';
  const brandLogoUrl = piece.brandLogoUrl || resolveBrandLogoUrlByName(brandName) || undefined;
  const categoryLabel = piece.category ?? 'Standard';
  const pieceTypeLabel = piece.pieceType || 'Garment';
  
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-cyan-200/45 bg-[linear-gradient(145deg,rgba(59,130,246,0.34)_0%,rgba(20,184,166,0.3)_52%,rgba(6,182,212,0.26)_100%)] ${compact ? 'p-3' : 'p-4'} backdrop-blur-[14px] shadow-[0_10px_30px_rgba(2,6,23,0.36)] transition duration-300 hover:scale-[1.02] hover:border-cyan-100/70 hover:shadow-[0_16px_42px_rgba(34,211,238,0.24)] ${FILTER_GLOW_LINE} ${GLOW_LINE}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_44%),linear-gradient(130deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_48%,rgba(14,116,144,0.2)_100%)] opacity-90" />
      <div aria-hidden className="pointer-events-none absolute inset-[1px] rounded-2xl border border-cyan-100/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_0_38px_rgba(8,145,178,0.2)]" />

      <div className="relative z-[1] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <p className={`truncate pr-1 text-sm font-semibold ${TEXT_GLOW}`}>{pieceName}</p>
          </div>
          <VisualToken type="category" value={pieceTypeLabel} compact />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <BrandBadge brandName={brandName} brandLogoUrl={brandLogoUrl} variant="compact" />
          </div>
          <VisualToken type="rarity" value={categoryLabel} compact />
        </div>

        {!compact ? <WearstyleChips wearstyles={piece.wearstyles} pieceType={piece.pieceType} /> : null}
      </div>
    </article>
  );
}
