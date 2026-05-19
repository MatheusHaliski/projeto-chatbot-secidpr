'use client';

import type React from 'react';
import Image from 'next/image';
import { Tester2DOverlayLayer as Layer } from '@/app/services/Tester2DOverlayService';

const toObjectFit = (fitMode: Layer['fitMode']): React.CSSProperties['objectFit'] => {
  if (fitMode === 'cover') return 'cover';
  if (fitMode === 'stretch-width' || fitMode === 'stretch-height') return 'fill';
  return 'contain';
};

export default function Tester2DOverlayLayer({ layer, debug = false }: { layer: Layer; debug?: boolean }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${layer.style.leftPct}%`,
        top: `${layer.style.topPct}%`,
        width: `${layer.style.widthPct}%`,
        height: `${layer.style.heightPct}%`,
        zIndex: layer.style.zIndex,
        transform: `rotate(${layer.style.rotate}deg)`,
      }}
    >
      <Image src={layer.imageUrl} alt={layer.pieceId} fill className="pointer-events-none" style={{ objectFit: toObjectFit(layer.fitMode) }} unoptimized />
      {debug ? (
        <div className="pointer-events-none absolute inset-0 border border-emerald-300/80 bg-emerald-400/10 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
          <div className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5">
            {layer.slot} · {layer.fitMode} · {layer.scale.toFixed(2)}x
          </div>
        </div>
      ) : null}
    </div>
  );
}
