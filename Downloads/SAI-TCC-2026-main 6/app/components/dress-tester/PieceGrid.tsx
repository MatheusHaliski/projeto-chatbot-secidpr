'use client';

import Image from 'next/image';
import { WardrobePiece2D } from '@/app/lib/dress-tester-models';

interface PieceGridProps {
  pieces: WardrobePiece2D[];
  selectedPieceId: string | null;
  onSelect: (piece: WardrobePiece2D) => void;
}

export default function PieceGrid({ pieces, selectedPieceId, onSelect }: PieceGridProps) {
  if (!pieces.length) {
    return <p className="rounded-2xl border border-dashed border-white/30 bg-black/20 p-4 text-sm text-white/70">No ready assets for this category yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {pieces.map((piece) => {
        const selected = selectedPieceId === piece.piece_id;
        return (
          <button
            key={piece.piece_id}
            type="button"
            onClick={() => onSelect(piece)}
            className={`group rounded-2xl border p-2 text-left transition ${
              selected ? 'border-white bg-white/20' : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-black/30">
              <Image src={piece.thumbnail_url || piece.image_url} alt={piece.name} fill className="object-cover" />
            </div>
            <p className="text-sm font-semibold text-white">{piece.name}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{piece.brand ?? piece.brand_id}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{piece.piece_type}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Layer {piece.render_layer}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
