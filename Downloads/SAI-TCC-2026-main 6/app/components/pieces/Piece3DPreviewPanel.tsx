'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import Image from 'next/image';
import type { DiscoverablePiece } from './PieceDiscoveryCard';

interface Piece3DPreviewPanelProps {
  piece: DiscoverablePiece;
}

export default function Piece3DPreviewPanel({ piece }: Piece3DPreviewPanelProps) {
  const [modelIndex, setModelIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);

  const candidates = useMemo(() => {
    return [piece.model_3d_url, piece.model_branded_3d_url, piece.model_base_3d_url]
      .filter((url): url is string => Boolean(url?.trim()))
      .map((url) => (url.startsWith('http://') ? url.replace('http://', 'https://') : url));
  }, [piece]);

  const src = candidates[modelIndex] ?? null;

  useEffect(() => {
    if (!src || !viewerRef.current) return;

    const onLoad = () => {
      setLoaded(true);
      setError(null);
    };

    const onError = () => {
      if (modelIndex < candidates.length - 1) {
        setModelIndex((index) => index + 1);
        setError('Primary 3D file failed. Trying fallback...');
        return;
      }
      setError('3D preview unavailable for this piece right now.');
    };

    const viewer = viewerRef.current;
    viewer.addEventListener('load', onLoad as EventListener);
    viewer.addEventListener('error', onError as EventListener);
    return () => {
      viewer.removeEventListener('load', onLoad as EventListener);
      viewer.removeEventListener('error', onError as EventListener);
    };
  }, [src, modelIndex, candidates.length]);

  return (
    <div className="space-y-2">
      <Script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" />
      {src ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/40">
          <model-viewer
            ref={viewerRef}
            src={src}
            poster={piece.model_preview_url ?? undefined}
            camera-controls
            auto-rotate
            className="h-[300px] w-full"
          />
          {src && !loaded && !error ? <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm text-white">Loading 3D preview...</div> : null}
          {error && !loaded ? <div className="absolute inset-x-3 bottom-3 rounded-lg border border-cyan-300/50 bg-slate-950/80 px-3 py-2 text-xs text-cyan-100">{error}</div> : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/30">
          <Image src={piece.model_preview_url || piece.image_url || '/welcome-newcomers.png'} alt={`${piece.name} preview`} width={1200} height={700} className="h-[300px] w-full object-cover" unoptimized />
          <p className="border-t border-white/10 px-3 py-2 text-xs text-white/75">No 3D model found. Showing premium fallback preview.</p>
        </div>
      )}
    </div>
  );
}
