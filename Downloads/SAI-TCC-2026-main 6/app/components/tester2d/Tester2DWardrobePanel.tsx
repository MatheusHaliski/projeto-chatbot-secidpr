'use client';

import Image from 'next/image';

import { WardrobeFitProfile } from '@/app/lib/fashion-ai/types/wardrobe-fit';

export interface Tester2DWardrobeItem {
  pieceId: string;
  name: string;
  imageUrl: string;
  garmentCategory: 'tops' | 'bottoms' | 'full-body';
  fitProfile?: WardrobeFitProfile | null;
  tryOn2dImageUrl?: string | null;
}

interface Props {
  items: Tester2DWardrobeItem[];
  activePieceId: string | null;
  processingPieceId: string | null;
  onApply: (item: Tester2DWardrobeItem) => void;
}

export default function Tester2DWardrobePanel({ items, activePieceId, processingPieceId, onApply }: Props) {
  return <div className="grid max-h-[720px] gap-2 overflow-y-auto pr-1">{items.map((item) => {
    const active = activePieceId === item.pieceId;
    const loading = processingPieceId === item.pieceId;
    return (
      <button key={item.pieceId} onClick={() => onApply(item)} className={`relative flex items-center gap-2 rounded-xl border p-2 text-left transition ${active ? 'border-fuchsia-300/70 bg-fuchsia-400/10 shadow-md' : 'border-white/20 bg-black/25 hover:bg-white/10'}`}>
        <div className="relative h-16 w-12 overflow-hidden rounded-lg bg-black/35"><Image src={item.imageUrl} alt={item.name} fill className="object-contain" unoptimized /></div>
        <div>
          <p className="text-sm font-semibold text-white">{item.name}</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">{item.garmentCategory}</p>
        </div>
        {loading ? <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" /> : null}
      </button>
    );
  })}</div>;
}
