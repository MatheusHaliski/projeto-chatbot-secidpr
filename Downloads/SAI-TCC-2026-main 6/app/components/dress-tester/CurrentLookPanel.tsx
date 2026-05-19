'use client';

import Image from 'next/image';
import { DressTesterCategory, WardrobePiece2D } from '@/app/lib/dress-tester-models';

interface CurrentLookPanelProps {
  selectedPiecesByCategory: Partial<Record<DressTesterCategory, WardrobePiece2D>>;
  onRemove: (category: DressTesterCategory) => void;
}

const slots: Array<{ label: string; categories: DressTesterCategory[]; primary: DressTesterCategory }> = [
  { label: 'Upper', categories: ['dress', 'top'], primary: 'top' },
  { label: 'Lower', categories: ['dress', 'bottom'], primary: 'bottom' },
  { label: 'Shoes', categories: ['shoes'], primary: 'shoes' },
  { label: 'Outerwear', categories: ['outerwear'], primary: 'outerwear' },
  { label: 'Accessory', categories: ['bag', 'accessory'], primary: 'accessory' },
];

export default function CurrentLookPanel({ selectedPiecesByCategory, onRemove }: CurrentLookPanelProps) {
  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const piece = slot.categories.map((category) => selectedPiecesByCategory[category]).find(Boolean);
        return (
          <div key={slot.label} className="rounded-xl border border-white/20 bg-black/25 p-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{slot.label}</p>
              <button
                type="button"
                className="rounded-md border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70"
                onClick={() => onRemove(slot.primary)}
              >
                Remove
              </button>
            </div>
            {piece ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-black/35">
                  <Image src={piece.thumbnail_url || piece.image_url} alt={piece.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="text-sm text-white">{piece.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">{piece.brand ?? piece.brand_id}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/60">Empty slot.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
