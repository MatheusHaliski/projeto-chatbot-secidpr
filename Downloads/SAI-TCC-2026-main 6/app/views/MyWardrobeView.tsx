'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuthSessionProfile } from '@/app/lib/authSession';
import { getServerSession } from '@/app/lib/clientSession';
import ContextSectionMenu from '@/app/components/navigation/ContextSectionMenu';
import PageHeader from '@/app/components/shell/PageHeader';
import SectionBlock from '@/app/components/shared/SectionBlock';
import { resolveWardrobeModelUrl } from '@/app/lib/wardrobeModelUrl';
import ThreeDViewerModal from '@/app/components/wardrobe/ThreeDViewerModal';
import WardrobeItemViewerModal from '@/app/components/wardrobe/WardrobeItemViewerModal';
import ThreeDGenerationProgressModal from '@/app/components/wardrobe/ThreeDGenerationProgressModal';
import WardrobeItemCard from '@/app/components/wardrobe/WardrobeItemCard';
import { use3dAssetJob } from '@/app/hooks/use3dAssetJob';
import {
  buildBlenderWorkerSubmitPayload,
  reconcileBlenderWorkerJob,
  submitBlenderWorkerJob,
} from '@/app/services/blenderWorkerClient';
import type { SearchIntentOutput } from '@/app/lib/ai/providers/types';

interface WardrobeItem {
  wardrobe_item_id: string;
  name: string;
  image_url: string;
  image_assets?: { raw_upload_image_url?: string | null; segmented_png_url?: string | null; cleaned_png_url?: string | null; normalized_2d_preview_url?: string | null; approved_catalog_2d_url?: string | null; model_3d_url?: string | null };
  image_analysis?: { catalog_readiness_score?: number; recommended_action?: string };
  model_3d_url?: string | null;
  model_preview_url?: string | null;
  model_base_3d_url?: string | null;
  model_branded_3d_url?: string | null;
  model_status?: string;
  model_generation_error?: string | null;
  processingStartedAt?: string | null;
  cloud_job_id?: string | null;
  brand_applied?: boolean;
  fitProfile?: { preparationStatus?: string };
  brand: string;
  season: string;
  gender: string;
  piece_type: string;
}

const sections = ['Available', 'Unavailable', 'Favorites'];

const READY_STATUSES = new Set(['done', 'ready', 'completed', 'asset_available']);
const FAILED_STATUSES = new Set(['failed', 'failed_geometry_scope']);
const QUEUE_STATUSES = new Set([
  'queued_segmentation',
  'queued_base',
  'queued_branding',
  'queued_geometry_qa',
  'segmentation_done',
]);
const PROGRESS_STATUSES = new Set(['generating_base', 'branding_in_progress', 'base_done', 'retrying_generation', 'in_progress']);

function mapItemState(item: WardrobeItem): 'ready' | 'failed' | 'queued' | 'generating' | 'not_started' {
  const normalized = String(item.model_status ?? '').trim().toLowerCase();
  if (resolveWardrobeModelUrl(item) || READY_STATUSES.has(normalized)) return 'ready';
  if (FAILED_STATUSES.has(normalized)) return 'failed';
  if (QUEUE_STATUSES.has(normalized)) return 'queued';
  if (PROGRESS_STATUSES.has(normalized)) return 'generating';
  return 'not_started';
}

function stateLabel(state: ReturnType<typeof mapItemState>, status?: string, item?: WardrobeItem) {
  const normalizedError = String(item?.model_generation_error ?? '').trim().toLowerCase();
  const fitReady = String(item?.fitProfile?.preparationStatus ?? '').trim().toLowerCase() === 'ready';
  if (state === 'ready') return 'Ready for 3D Viewer';
  if (state === 'failed' && fitReady && (normalizedError.includes('low_quality') || normalizedError.includes('too dark') || normalizedError.includes('low contrast'))) {
    return 'Ready for 2D try-on · 3D generation failed: cleaned garment too dark/low contrast';
  }
  if (state === 'queued') return 'Queue pending';
  if (state === 'generating') return 'Generating asset';
  if (state === 'failed') return 'Failed (tap to retry)';
  return `Not started${status ? ` • ${status}` : ''}`;
}

export default function MyWardrobeView() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorCache, setCursorCache] = useState<Record<number, string | null>>({ 0: null });
  const [page, setPage] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSection, setSelectedSection] = useState(sections[0]?.toLowerCase() ?? 'available');
  const [availability, setAvailability] = useState<Record<string, 'available' | 'unavailable'>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [viewerItem, setViewerItem] = useState<WardrobeItem | null>(null);
  const [modalItem, setModalItem] = useState<WardrobeItem | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [progressItem, setProgressItem] = useState<WardrobeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchIntent, setSearchIntent] = useState<SearchIntentOutput | null>(null);

 const assetJob = use3dAssetJob({
  timeoutMs: 12 * 60 * 1000,   // 12 minutes, covers Meshy + Blender
  maxPollAttempts: 200,
});


  // Tracks which item last showed a stall error so the Retry click bypasses the stall check.
  const stalledItemIdRef = useRef<string | null>(null);
  const STALL_TTL_MS = 10 * 60 * 1000;

  useEffect(() => {
    const loadWardrobeData = async () => {
      setIsInitialLoading(true);
      const localProfile = getAuthSessionProfile();
      let userId = localProfile.user_id?.trim() || '';

      if (!userId) {
        const serverProfile = await getServerSession();
        userId = serverProfile?.user_id?.trim() || '';
      }

      if (!userId) {
        setItems([]);
        setHasMore(false);
        setIsInitialLoading(false);
        return;
      }

      const wardrobeResponse = await fetch(`/api/wardrobe-items/user/${userId}?status=active&limit=24`);
      const wardrobePayload = await wardrobeResponse.json().catch(() => ({ items: [], nextCursor: null }));
      const nextItems = wardrobeResponse.ok && Array.isArray(wardrobePayload?.items) ? wardrobePayload.items : [];
      setItems(nextItems);
      setCursor(typeof wardrobePayload?.nextCursor === 'string' ? wardrobePayload.nextCursor : null);
      setCursorCache({ 0: null, 1: typeof wardrobePayload?.nextCursor === 'string' ? wardrobePayload.nextCursor : null });
      setPage(0);
      setHasMore(Boolean(wardrobePayload?.nextCursor));
      setIsInitialLoading(false);
    };

    void loadWardrobeData().catch(() => {
      setItems([]);
      setHasMore(false);
      setIsInitialLoading(false);
    });
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !cursor) return;
    setIsLoadingMore(true);
    try {
      const localProfile = getAuthSessionProfile();
      const userId = localProfile.user_id?.trim() || '';
      if (!userId) return;

      const wardrobeResponse = await fetch(`/api/wardrobe-items/user/${userId}?status=active&limit=24&cursor=${encodeURIComponent(cursor)}`);
      const wardrobePayload = await wardrobeResponse.json().catch(() => ({ items: [], nextCursor: null }));
      const nextItems = wardrobeResponse.ok && Array.isArray(wardrobePayload?.items) ? wardrobePayload.items : [];
      setItems((prev) => [...prev, ...nextItems]);
      setCursor(typeof wardrobePayload?.nextCursor === 'string' ? wardrobePayload.nextCursor : null);
      setHasMore(Boolean(wardrobePayload?.nextCursor));
      setPage((prev) => {
        const nextPage = prev + 1;
        setCursorCache((current) => ({ ...current, [nextPage + 1]: wardrobePayload?.nextCursor ?? null }));
        return nextPage;
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const grouped = useMemo(() => {
    const available = items.filter((item) => (availability[item.wardrobe_item_id] ?? 'available') === 'available');
    const unavailable = items.filter((item) => (availability[item.wardrobe_item_id] ?? 'available') === 'unavailable');
    const favorite = items.filter((item) => favorites[item.wardrobe_item_id]);
    return { available, unavailable, favorite };
  }, [availability, favorites, items]);

  const activeGroups = useMemo(() => {
    const groups = [
      { key: 'available', title: 'Available Pieces', data: grouped.available },
      { key: 'unavailable', title: 'Unavailable Pieces', data: grouped.unavailable },
      { key: 'favorite', title: 'Favorite Pieces', data: grouped.favorite },
    ] as const;

    const sectionToGroupKey: Record<string, (typeof groups)[number]['key']> = {
      available: 'available',
      unavailable: 'unavailable',
      favorites: 'favorite',
    };

    let selectedGroupData = groups.find((group) => group.key === (sectionToGroupKey[selectedSection] ?? 'available'))?.data || [];
    
    if (searchIntent) {
      selectedGroupData = selectedGroupData.map(item => {
        let score = 0;
        const text = `${item.name} ${item.brand} ${item.season} ${item.gender} ${item.piece_type}`.toLowerCase();
        
        const match = (arr: string[], weight: number) => {
          if (arr && arr.length) {
            arr.forEach(term => {
              if (text.includes(term.toLowerCase())) score += weight;
            });
          }
        };

        match(searchIntent.piece_item, 3);
        match(searchIntent.brand, 3);
        match(searchIntent.colors, 2);
        match(searchIntent.season, 2);
        match(searchIntent.style, 1);
        match(searchIntent.occasion, 1);
        match(searchIntent.semanticTags, 1);
        
        return { item, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item);
    } else if (searchQuery.trim().length > 0) {
       // Simple text fallback if AI intent not present
       const query = searchQuery.toLowerCase();
       selectedGroupData = selectedGroupData.filter(item => 
          `${item.name} ${item.brand} ${item.piece_type}`.toLowerCase().includes(query)
       );
    }

    const selectedGroup = groups.find((group) => group.key === (sectionToGroupKey[selectedSection] ?? 'available'));
    return selectedGroup ? [{ ...selectedGroup, data: selectedGroupData }] : [{ ...groups[0], data: selectedGroupData }];
  }, [grouped, selectedSection, searchIntent, searchQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchIntent(null);
      return;
    }
    
    setIsSearching(true);
    setSearchIntent(null);
    try {
      const response = await fetch('/api/ai/fashion/search-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const result = await response.json();
      if (result.ok && result.data) {
        setSearchIntent(result.data);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenViewerIntent = async (item: WardrobeItem) => {
    if (progressItem !== null && !['completed', 'failed', 'timed_out', 'cancelled', 'idle'].includes(assetJob.status)) {
      return;
    }

    const existingModel = resolveWardrobeModelUrl(item);
    if (existingModel) {
      setViewerItem(item);
      setViewerUrl(existingModel);
      return;
    }

    const modelStatus = String(item.model_status ?? '').trim().toLowerCase();
    const cloudJobId = item.cloud_job_id?.trim() ?? '';
    const isInFlight = (modelStatus === 'processing' || modelStatus === 'processing_timeout') && Boolean(cloudJobId);

    setProgressItem(item);

    // Stall detection: if this item has been in "processing" for more than 10 minutes,
    // the pod likely restarted and lost the job. Show an error state with a Retry button
    // rather than attempting to poll a dead job. The stalledItemIdRef bypass lets the
    // Retry click skip this check and go straight to creating a new job.
    if (
      modelStatus === 'processing' &&
      stalledItemIdRef.current !== item.wardrobe_item_id &&
      item.processingStartedAt != null &&
      Date.now() - new Date(item.processingStartedAt).getTime() > STALL_TTL_MS
    ) {
      stalledItemIdRef.current = item.wardrobe_item_id;
      assetJob.setStatus('failed');
      assetJob.setError('Generation stalled: the worker pod may have restarted. Click Retry to start a new generation.');
      return;
    }
    stalledItemIdRef.current = null;

    if (isInFlight) {
      // One-shot check: try to reconcile the existing job eagerly.
      // If it's done → open viewer directly.
      // If still running → start polling.
      // If job_not_found (worker restarted, no artifacts on disk) → fall through to new job.
      try {
        const result = await reconcileBlenderWorkerJob(item.wardrobe_item_id, cloudJobId);
        const resultStatus = String(result.status ?? '').toLowerCase();
        const model3dUrl = typeof result.model_3d_url === 'string' ? result.model_3d_url.trim() : '';

        if (resultStatus === 'completed' && model3dUrl) {
          setProgressItem(null);
          setViewerItem(item);
          setViewerUrl(model3dUrl);
          return;
        }

        if (resultStatus === 'processing') {
          await assetJob.startJob({
            existingJobId: cloudJobId,
            pollJob: async (jobId) => {
              const payload = await reconcileBlenderWorkerJob(item.wardrobe_item_id, jobId);
              console.log('[3d-worker] reconcile:poll', { pieceId: item.wardrobe_item_id, jobId, status: payload.status ?? null });
              if (String(payload.status ?? '').toLowerCase() === 'job_not_found') {
                throw new Error('Job no longer exists in the worker. Click Retry to start a new generation.');
              }
              return payload;
            },
          });
          return;
        }

        // job_not_found or failed — fall through to create a new job below
        console.log('[3d-worker] reconcile:stale-job', { pieceId: item.wardrobe_item_id, cloudJobId, resultStatus });
      } catch (err) {
        // Worker unreachable or unexpected error — fall through to new job
        console.warn('[3d-worker] reconcile:error-fallback', { pieceId: item.wardrobe_item_id, cloudJobId, error: String(err) });
      }
    }

    await assetJob.startJob({
      createJob: async () => {
        const payload = buildBlenderWorkerSubmitPayload(item as unknown as Record<string, unknown>);
        console.log('[3d-worker] submit:start', {
          pieceId: item.wardrobe_item_id,
          pieceName: item.name,
          imageUrl: payload.imageUrl,
          payload,
        });
        const response = await submitBlenderWorkerJob(payload);
        console.log('[3d-worker] submit:done', {
          pieceId: item.wardrobe_item_id,
          pieceName: item.name,
          jobId: response.jobId ?? response.job_id ?? response.id ?? null,
        });
        return response;
      },
      pollJob: async (jobId) => {
        const payload = await reconcileBlenderWorkerJob(item.wardrobe_item_id, jobId);
        console.log('[3d-worker] reconcile:poll', {
          pieceId: item.wardrobe_item_id,
          pieceName: item.name,
          jobId,
          status: payload.status ?? null,
        });
        if (String(payload.status ?? '').toLowerCase() === 'job_not_found') {
          throw new Error('Job no longer exists in the worker. Click Retry to start a new generation.');
        }
        return payload;
      },
    });
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ContextSectionMenu
          title="Virtual Wardrobe"
          sections={sections}
          selectedSection={sections.find((section) => section.toLowerCase() === selectedSection) ?? sections[0]}
          onSelectSection={(section) => setSelectedSection(section.toLowerCase())}
        />
        <div className="space-y-6">
          <PageHeader title="Virtual Wardrobe" subtitle="Classify pieces as available, unavailable, and favorites." />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                placeholder="✨ Semantic search (e.g. roupas de inverno pretas)"
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/50"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value === '') setSearchIntent(null);
                }}
              />
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2 font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'AI Search'}
              </button>
            </form>
            {searchIntent && (
               <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/70">
                 {searchIntent.colors.map(c => <span key={c} className="rounded border border-white/20 bg-white/10 px-1 py-0.5">🎨 {c}</span>)}
                 {searchIntent.season.map(s => <span key={s} className="rounded border border-white/20 bg-white/10 px-1 py-0.5">❄️ {s}</span>)}
                 {searchIntent.piece_item.map(p => <span key={p} className="rounded border border-white/20 bg-white/10 px-1 py-0.5">👕 {p}</span>)}
                 {searchIntent.style.map(s => <span key={s} className="rounded border border-white/20 bg-white/10 px-1 py-0.5">✨ {s}</span>)}
                 {searchIntent.brand.map(b => <span key={b} className="rounded border border-white/20 bg-white/10 px-1 py-0.5">🏷️ {b}</span>)}
               </div>
            )}
          </div>

          {activeGroups.map((group) => (
            <SectionBlock key={group.key} title={group.title} subtitle="Manage list status for each wardrobe item.">
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {isInitialLoading ? <p className="text-sm text-white/70">Loading wardrobe items…</p> : null}
                {group.data.map((item) => {
                  const cardState = mapItemState(item);
                  return (
                    <WardrobeItemCard
                      key={item.wardrobe_item_id}
                      name={item.name}
                      imageUrl={item.image_url}
                      imageAssets={item.image_assets}
                      brand={item.brand}
                      pieceType={item.piece_type}
                      state={cardState}
                      statusLabel={stateLabel(cardState, item.model_status, item)}
                      onClick={() => setModalItem(item)}
                      onAvailable={() => setAvailability((prev) => ({ ...prev, [item.wardrobe_item_id]: 'available' }))}
                      onUnavailable={() => setAvailability((prev) => ({ ...prev, [item.wardrobe_item_id]: 'unavailable' }))}
                      onToggleFavorite={() => setFavorites((prev) => ({ ...prev, [item.wardrobe_item_id]: !prev[item.wardrobe_item_id] }))}
                    />
                  );
                })}
                {!group.data.length ? <p className="text-sm text-white/70">No pieces in this list.</p> : null}
              </div>
              {group.key === 'available' && hasMore ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-white/60">Page {page + 1} · Cached cursors: {Object.keys(cursorCache).length}</p>
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={isLoadingMore}
                    className="rounded-full border border-white/25 px-3 py-1 text-xs text-white disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </SectionBlock>
          ))}
        </div>
      </div>


      <WardrobeItemViewerModal
        open={Boolean(modalItem)}
        item={modalItem}
        onClose={() => setModalItem(null)}
        onOpen3D={() => {
          if (!modalItem) return;
          setModalItem(null);
          void handleOpenViewerIntent(modalItem);
        }}
      />

      <ThreeDGenerationProgressModal
        open={Boolean(progressItem) && !viewerUrl}
        status={assetJob.status}
        progressPercent={assetJob.progressPercent}
        pollAttempts={assetJob.pollAttempts}
        error={assetJob.error}
        onClose={() => {
          assetJob.cancelPolling();
          setProgressItem(null);
        }}
        onRetry={() => {
          if (!progressItem) return;
          assetJob.cancelPolling();
          void handleOpenViewerIntent(progressItem);
        }}
      />

      {viewerItem && viewerUrl ? (
        <ThreeDViewerModal
          open
          title={`${viewerItem.name} • 3D Viewer`}
          modelUrl={viewerUrl}
          posterUrl={viewerItem.model_preview_url ?? undefined}
          onClose={() => {
            setViewerItem(null);
            setViewerUrl(null);
          }}
        />
      ) : null}
    </>
  );
}
