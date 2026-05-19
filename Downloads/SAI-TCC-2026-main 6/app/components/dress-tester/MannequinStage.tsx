'use client';

import Image from 'next/image';
import { Mannequin2D, ResolvedLayer } from '@/app/lib/dress-tester-models';

interface MannequinStageProps {
  mannequin: Mannequin2D;
  layers: ResolvedLayer[];
  showGrid?: boolean;
  highlightedType?: string;
}

export default function MannequinStage({ mannequin, layers, showGrid = false, highlightedType }: MannequinStageProps) {
  return (
    <div className="rounded-3xl border border-white/20 bg-gradient-to-b from-white/10 to-black/30 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
      <div className="relative mx-auto w-full max-w-[580px] overflow-hidden rounded-2xl bg-black/40" style={{ aspectRatio: `${mannequin.canvas_width}/${mannequin.canvas_height}` }}>
        {showGrid ? (
          <div
            className="pointer-events-none absolute inset-0 z-[2] opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        ) : null}
        {mannequin.shadow_image_url ? (
          <Image src={mannequin.shadow_image_url} alt="mannequin shadow" fill className="pointer-events-none absolute inset-0 object-contain opacity-90" />
        ) : null}
        {mannequin.hair_back_url ? (
          <Image src={mannequin.hair_back_url} alt="hair back" fill className="pointer-events-none absolute inset-0 object-contain" />
        ) : null}
        <Image src={mannequin.base_image_url} alt={mannequin.name} fill className="absolute inset-0 object-contain" priority />

        {layers.map((layer) => (
          <Image
            key={layer.piece_id}
            src={layer.image_url}
            alt={layer.name}
            fill
            className={`absolute inset-0 object-contain opacity-100 transition duration-300 ${
              highlightedType && layer.piece_type === highlightedType ? 'drop-shadow-[0_0_18px_rgba(255,255,255,0.65)]' : ''
            }`}
            style={{
              transform: `translate(${layer.anchor.x}px, ${layer.anchor.y}px) scale(${layer.anchor.scale})`,
              zIndex: layer.render_layer,
            }}
          />
        ))}

        {mannequin.face_layer_url ? (
          <Image src={mannequin.face_layer_url} alt="face layer" fill className="pointer-events-none absolute inset-0 object-contain" />
        ) : null}
        {mannequin.hair_front_url ? (
          <Image src={mannequin.hair_front_url} alt="hair front" fill className="pointer-events-none absolute inset-0 object-contain" />
        ) : null}
      </div>
    </div>
  );
}
