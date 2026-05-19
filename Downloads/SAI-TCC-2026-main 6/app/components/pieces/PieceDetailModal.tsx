'use client';

import type { DiscoverablePiece } from './PieceDiscoveryCard';
import Piece3DPreviewPanel from './Piece3DPreviewPanel';

interface PieceDetailModalProps {
  open: boolean;
  piece: DiscoverablePiece | null;
  onClose: () => void;
}

export default function PieceDetailModal({ open, piece, onClose }: PieceDetailModalProps) {
  if (!open || !piece) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div className="sa-premium-gradient-surface w-full max-w-5xl rounded-3xl border border-white/25 p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">{piece.name}</h3>
            <p className="text-sm text-white/70">{piece.brand} • {piece.piece_type} • by {piece.creator_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white">Close</button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Piece3DPreviewPanel key={piece.wardrobe_item_id} piece={piece} />
          <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm text-white/85">
            <p><strong>Rarity:</strong> {piece.rarity}</p>
            <p><strong>Color:</strong> {piece.color || 'N/A'}</p>
            <p><strong>Material:</strong> {piece.material || 'N/A'}</p>
            <p><strong>Season:</strong> {piece.season}</p>
            <p><strong>Gender:</strong> {piece.gender}</p>
            <p><strong>Wearstyles:</strong> {piece.wearstyles.join(', ') || 'N/A'}</p>
            <p><strong>Style tags:</strong> {piece.style_tags.join(', ') || 'N/A'}</p>
            <p><strong>Occasions:</strong> {piece.occasion_tags.join(', ') || 'N/A'}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="rounded-lg border border-white/25 px-2 py-2 text-xs">View Creator</button>
              <button type="button" className="rounded-lg border border-white/25 px-2 py-2 text-xs">Save Piece</button>
              <button type="button" className="rounded-lg border border-white/25 px-2 py-2 text-xs">Add to My Scheme</button>
              <button type="button" className="rounded-lg border border-white/25 px-2 py-2 text-xs">Use in Dress Tester</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
