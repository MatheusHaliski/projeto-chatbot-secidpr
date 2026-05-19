'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/app/components/shell/PageHeader';
import SectionBlock from '@/app/components/shared/SectionBlock';
import Tester2DMannequinSelector from '@/app/components/tester2d/Tester2DMannequinSelector';
import Image from 'next/image';
import Tester2DWardrobePanel, { Tester2DWardrobeItem } from '@/app/components/tester2d/Tester2DWardrobePanel';
import { MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';

interface BootstrapPayload {
  mannequins: MannequinProfile[];
  pieces: Array<{ pieceId: string; name: string; imageUrl: string; category?: 'tops' | 'bottoms' | 'full-body'; tryOn2dResultUrl?: string | null }>;
}

export default function DressTesterView() {
  const [loading, setLoading] = useState(true);
  const [pieces, setPieces] = useState<Tester2DWardrobeItem[]>([]);
  const [mannequins, setMannequins] = useState<MannequinProfile[]>([]);
  const [selectedMannequin, setSelectedMannequin] = useState<'male_v1' | 'female_v1'>('female_v1');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [processingPieceId, setProcessingPieceId] = useState<string | null>(null);
  const [stageImageUrl, setStageImageUrl] = useState('');
  const [stageError, setStageError] = useState<string | null>(null);
  const [tryOnCache, setTryOnCache] = useState<Record<string, string>>({});

  const mannequin = useMemo(() => mannequins.find((item) => item.id === selectedMannequin) ?? mannequins[0], [mannequins, selectedMannequin]);
  const mannequinImageAbsoluteUrl = useMemo(() => {
    if (!mannequin?.baseImageUrl) return '';
    if (/^https?:\/\//i.test(mannequin.baseImageUrl)) return mannequin.baseImageUrl;
    if (typeof window === 'undefined') return mannequin.baseImageUrl;
    return new URL(mannequin.baseImageUrl, window.location.origin).toString();
  }, [mannequin]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/dress-tester/bootstrap');
    const payload = (await response.json()) as BootstrapPayload;
    setMannequins(payload.mannequins ?? []);
    const mapped = (payload.pieces ?? []).map((piece) => ({ pieceId: piece.pieceId, name: piece.name, imageUrl: piece.imageUrl, garmentCategory: piece.category ?? 'tops', tryOn2dImageUrl: piece.tryOn2dResultUrl ?? null }));
    setPieces(mapped);
    setTryOnCache((prev) => {
      const next = { ...prev };
      for (const piece of mapped) {
        if (piece.tryOn2dImageUrl) {
          next[piece.pieceId] = piece.tryOn2dImageUrl;
        }
      }
      return next;
    });
    setLoading(false);
  }, [selectedMannequin]);

  useEffect(() => { void refreshData(); }, [refreshData]);
  useEffect(() => {
    setStageError(null);
    setSelectedPieceId(null);
    setProcessingPieceId(null);
    setStageImageUrl('');
  }, [selectedMannequin]);

  const runTryOn = useCallback(async (piece: Tester2DWardrobeItem) => {
    if (!mannequin || !mannequinImageAbsoluteUrl) return;
    setSelectedPieceId(piece.pieceId);
    setStageError(null);
    const cacheKey = piece.pieceId;
    const cachedImageUrl = tryOnCache[cacheKey];
    if (cachedImageUrl) {
      setStageImageUrl(cachedImageUrl);
      return;
    }
    setProcessingPieceId(piece.pieceId);
    const response = await fetch('/api/dress-tester/try-on-2d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ garmentId: piece.pieceId, garmentImageUrl: piece.imageUrl, garmentCategory: piece.garmentCategory, mannequinImageUrl: mannequinImageAbsoluteUrl }) });
    const payload = await response.json();
    setProcessingPieceId(null);
    if (!response.ok || payload.status !== 'completed' || !payload.resultImageUrl) {
      const errRaw = payload.error;
      setStageError(typeof errRaw === 'string' ? errRaw : (errRaw && typeof errRaw === 'object' ? ((errRaw as { message?: string }).message ?? JSON.stringify(errRaw)) : 'Could not fit garment right now.'));
      return;
    }
    setStageImageUrl(payload.resultImageUrl);
    setTryOnCache((prev) => ({ ...prev, [cacheKey]: payload.resultImageUrl as string }));
  }, [mannequin, mannequinImageAbsoluteUrl, tryOnCache]);

  if (loading) return <div className="p-6 text-sm uppercase tracking-[0.2em] text-white/70">Loading Tester 2D...</div>;
  if (!mannequin) return <div className="p-6 text-sm text-white/70">No mannequin profiles found.</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Tester 2D" subtitle="Automatic 2D try-on powered by external APIs" />
      <SectionBlock title="Controls" subtitle="Choose mannequin and start by selecting a wardrobe piece">
        <Tester2DMannequinSelector mannequins={mannequins} selectedId={selectedMannequin} onChange={setSelectedMannequin} />
      </SectionBlock>
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_380px]">
        <SectionBlock title="AI Fit Analysis" subtitle="Analysis appears after successful try-on">
          {selectedPieceId && stageImageUrl ? <p className="text-sm text-white/80">Fit analysis available for selected piece.</p> : <p className="text-white/50 text-xs">Select a piece to see fit analysis</p>}
        </SectionBlock>
        <SectionBlock title="Editing Stage" subtitle="Automatic fitted mannequin render">
          <div className="rounded-3xl border border-white/20 bg-black/35 p-4">
            <div className="relative mx-auto aspect-[2/3] w-full max-w-[420px] overflow-hidden rounded-2xl bg-gradient-to-b from-black/30 to-black/65">
              <Image src={stageImageUrl || mannequin.baseImageUrl} alt="Try-on stage" fill className="object-contain transition-opacity duration-400 ease-in" unoptimized priority />
              {processingPieceId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <p className="mt-3 text-sm">Fitting garment...</p>
                </div>
              ) : null}
              {stageError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
                  <div className="rounded-xl border border-rose-300/40 bg-rose-950/70 p-4 text-center text-rose-100">
                    <p className="text-sm">⚠️ {stageError}</p>
                    <button type="button" className="mt-3 rounded-lg border border-rose-200/60 px-3 py-1 text-xs" onClick={() => { const piece = pieces.find((p) => p.pieceId === selectedPieceId); if (piece) void runTryOn(piece); }}>Try again</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionBlock>
        <SectionBlock title="Wardrobe 2D Library" subtitle="Click any card to automatically run 2D try-on">
          <Tester2DWardrobePanel items={pieces} activePieceId={selectedPieceId} processingPieceId={processingPieceId} onApply={(item) => void runTryOn(item)} />
        </SectionBlock>
      </div>
    </div>
  );
}
