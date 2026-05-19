'use client';

import Image from 'next/image';

export interface DiscoverablePiece {
  wardrobe_item_id: string;
  user_id: string;
  creator_name: string;
  name: string;
  image_url: string;
  piece_type: string;
  brand: string;
  color: string;
  material: string;
  rarity: string;
  wearstyles: string[];
  style_tags: string[];
  occasion_tags: string[];
  season: string;
  gender: string;
  model_3d_url?: string | null;
  model_preview_url?: string | null;
  model_base_3d_url?: string | null;
  model_branded_3d_url?: string | null;
  description?: string;
}

interface PieceDiscoveryCardProps {
  piece: DiscoverablePiece;
  onOpen: (piece: DiscoverablePiece) => void;
}

export default function PieceDiscoveryCard({ piece, onOpen }: PieceDiscoveryCardProps) {
  const has3D = Boolean(piece.model_3d_url || piece.model_base_3d_url || piece.model_branded_3d_url);

  return (
    <article
      onClick={() => onOpen(piece)}
      className="group cursor-pointer rounded-2xl border border-white/20 bg-white/10 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:-translate-y-1 hover:border-cyan-300/60"
    >
      <div className="relative">
        <Image src={piece.image_url || '/welcome-newcomers.png'} alt={piece.name} width={640} height={420} className="h-44 w-full rounded-xl object-cover" unoptimized />
        {has3D ? (
          <span className="absolute right-2 top-2 rounded-full border border-cyan-200/60 bg-cyan-500/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-100">
            3D Ready
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{piece.name}</h3>
      <p className="text-xs text-white/75">{piece.brand} • {piece.piece_type}</p>
      <p className="text-xs text-fuchsia-200/85">{piece.rarity} • {piece.creator_name}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {piece.wearstyles.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] text-white/80">{tag}</span>
        ))}
      </div>
    </article>
  );
}
