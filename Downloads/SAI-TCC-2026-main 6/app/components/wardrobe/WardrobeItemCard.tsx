'use client';

import Image from 'next/image';
import { getBest2DAssetForWardrobeItem } from '@/app/services/Tester2DAssetResolver';

type CardState = 'ready' | 'generating' | 'queued' | 'failed' | 'not_started';

interface Props {
  name: string;
  imageUrl: string;
  imageAssets?: { approved_catalog_2d_url?: string | null; normalized_2d_preview_url?: string | null; raw_upload_image_url?: string | null };
  brand: string;
  pieceType: string;
  statusLabel: string;
  state: CardState;
  onClick: () => void;
  onAvailable: () => void;
  onUnavailable: () => void;
  onToggleFavorite: () => void;
}

const STYLE_BY_STATE: Record<CardState, string> = {
  ready: 'border-emerald-300/60 text-emerald-100',
  generating: 'border-amber-300/60 text-amber-100',
  queued: 'border-amber-300/60 text-amber-100',
  failed: 'border-rose-300/60 text-rose-100',
  not_started: 'border-white/25 text-white/80',
};

export default function WardrobeItemCard(props: Props) {
  const preview2D = getBest2DAssetForWardrobeItem({ image_url: props.imageUrl, image_assets: props.imageAssets });

  return (
    <article onClick={props.onClick} className={`cursor-pointer rounded-2xl border p-4 transition hover:border-cyan-300/60 ${STYLE_BY_STATE[props.state]}`}>
      <Image src={preview2D} alt={props.name} width={640} height={360} className="h-36 w-full rounded-xl object-cover" unoptimized />
      <h3 className="mt-3 text-base font-semibold text-white">{props.name}</h3>
      <p className="text-sm text-white/70">Brand: {props.brand}</p>
      <p className="text-sm text-white/70">Type: {props.pieceType}</p>
      <p className="mt-1 text-xs">{props.statusLabel}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={(event) => { event.stopPropagation(); props.onAvailable(); }} className="rounded-lg border border-white/30 px-2 py-1 text-xs text-white">Available</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); props.onUnavailable(); }} className="rounded-lg border border-white/30 px-2 py-1 text-xs text-white">Unavailable</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); props.onToggleFavorite(); }} className="rounded-lg border border-white/30 px-2 py-1 text-xs text-white">★ Favorite</button>
      </div>
    </article>
  );
}
