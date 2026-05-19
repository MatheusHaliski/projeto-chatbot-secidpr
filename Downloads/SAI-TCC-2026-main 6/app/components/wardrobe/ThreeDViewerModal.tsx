'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

interface Props {
  open: boolean;
  title: string;
  modelUrl: string;
  posterUrl?: string;
  onClose: () => void;
}

export default function ThreeDViewerModal({ open, title, modelUrl, posterUrl, onClose }: Props) {
  const modelViewerRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const safeUrl = useMemo(() => modelUrl.startsWith('http://') ? modelUrl.replace('http://', 'https://') : modelUrl, [modelUrl]);
  const proxiedModelUrl = useMemo(() => safeUrl.includes('assets.meshy.ai') ? `/api/model-proxy?url=${encodeURIComponent(safeUrl)}` : safeUrl, [safeUrl]);
  const proxiedPoster = useMemo(() => {
    if (!posterUrl) return undefined;
    const safePoster = posterUrl.startsWith('http://') ? posterUrl.replace('http://', 'https://') : posterUrl;
    return safePoster.includes('assets.meshy.ai') ? `/api/model-proxy?url=${encodeURIComponent(safePoster)}` : safePoster;
  }, [posterUrl]);

  useEffect(() => {
    if (!open || !modelViewerRef.current) return;

    const element = modelViewerRef.current;
    const onLoad = () => {
      setLoading(false);
      setError(null);
    };

    const onError = () => {
      setLoading(false);
      setError('Model asset failed to load.');
    };

    element.addEventListener('load', onLoad as EventListener);
    element.addEventListener('error', onError as EventListener);

    return () => {
      element.removeEventListener('load', onLoad as EventListener);
      element.removeEventListener('error', onError as EventListener);
    };
  }, [open, proxiedModelUrl, reloadKey]);

  if (!open) return null;

  return (
    <>
      <Script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js" />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-4xl rounded-2xl border border-white/20 bg-slate-950 p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/25 px-3 py-1 text-sm text-white">Close</button>
          </div>
          <div className="relative">
            <model-viewer
              key={`${proxiedModelUrl}-${reloadKey}`}
              ref={modelViewerRef}
              src={proxiedModelUrl}
              poster={proxiedPoster}
              ar={false}
              camera-controls
              touch-action="none"
              interaction-prompt="auto"
              auto-rotate
              className="h-[60vh] w-full rounded-xl bg-slate-900"
            />
            {loading ? <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/55 text-sm text-white/90">Loading 3D model...</div> : null}
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 p-4 text-center text-sm text-white">
                <p>{error}</p>
                <button type="button" className="rounded-lg border border-cyan-300/70 px-3 py-1 text-cyan-100" onClick={() => { setLoading(true); setError(null); setReloadKey((value) => value + 1); }}>Retry load</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
