'use client';

import Image from 'next/image';
import { MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';
import { Tester2DLayer } from '@/app/lib/fashion-ai/services/Tester2DRenderService';

interface Props {
  mannequin: MannequinProfile;
  layers: Tester2DLayer[];
  zoom: number;
  showDebug: boolean;
  selectedSlot: string | null;
}

export default function Tester2DStage({ mannequin, layers, zoom, showDebug, selectedSlot }: Props) {
  return (
    <div className="rounded-3xl border border-white/20 bg-black/35 p-4">
      <div
        className="relative mx-auto aspect-[2/3] w-full max-w-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-black/30 to-black/65"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
      >
        {layers.map((layer, i) => {
          if (layer.type === 'mannequin-base') {
            return (
              <Image
                key={`base-${i}`}
                src={layer.imageUrl}
                alt={mannequin.id}
                fill
                className="object-contain"
                unoptimized
                priority
              />
            );
          }

          const isSelected = selectedSlot === layer.slot;
          return (
            <div
              key={`garment-${layer.slot}-${i}`}
              className="absolute"
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                width: `${layer.width * 100}%`,
                height: `${layer.height * 100}%`,
              }}
            >
              <Image
                src={layer.imageUrl}
                alt={layer.slot}
                fill
                className="object-contain"
                unoptimized
              />
              {showDebug && (
                <div
                  className={`absolute inset-0 border-2 ${isSelected ? 'border-fuchsia-400' : 'border-amber-400/60'}`}
                >
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">
                    {layer.slot}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
