export type PipelineProvider = 'runpod' | 'meshy' | 'local' | 'branding';

export interface PipelineInputSnapshot {
  pieceId: string;
  name: string;
  userId: string;
  imageUrlPresent: boolean;
  preparedAssetUrlPresent: boolean;
  brandId: string;
  brandIdDetected: string | null;
  brandIdSelected: string | null;
  preparationStatus: string;
  hasFitProfile: boolean;
  hasGarmentAnchors: boolean;
  hasNormalizedBBox: boolean;
  geometryScopePassed: boolean;
}

export interface PipelineStageDetails {
  stage: 'failed' | 'processing' | 'completed';
  failedStage?: string;
  provider?: PipelineProvider;
  errorCode?: string;
  message?: string;
  hint?: string;
  retryable?: boolean;
  nextAction?: string;
  requestUrl?: string | null;
  responseStatus?: number | null;
  responseBodyPreview?: string | null;
  inputSnapshot?: PipelineInputSnapshot;
  diagnostics?: Record<string, unknown>;
  history?: Array<Record<string, unknown>>;
}

export function canonicalizeBrandId(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'default';
  if (normalized === 'lacoste' || normalized === 'brand_lacoste') return 'lacoste';
  return normalized.replace(/^brand_/, '');
}

export function buildPipelineInputSnapshot(item: Record<string, unknown>): PipelineInputSnapshot {
  const fitProfile = item.fitProfile && typeof item.fitProfile === 'object' ? (item.fitProfile as Record<string, unknown>) : null;
  return {
    pieceId: String(item.wardrobe_item_id ?? ''),
    name: String(item.name ?? ''),
    userId: String(item.user_id ?? ''),
    imageUrlPresent: Boolean(String(item.image_url ?? '').trim()),
    preparedAssetUrlPresent: Boolean(String(fitProfile?.preparedAssetUrl ?? '').trim()),
    brandId: String(item.brand_id ?? ''),
    brandIdDetected: fitProfile ? (String(item.brand_id_detected ?? '').trim() || null) : null,
    brandIdSelected: String(item.brand_id_selected ?? '').trim() || null,
    preparationStatus: String(fitProfile?.preparationStatus ?? 'missing'),
    hasFitProfile: Boolean(fitProfile),
    hasGarmentAnchors: Boolean(fitProfile?.garmentAnchors),
    hasNormalizedBBox: Boolean(fitProfile?.normalizedBBox),
    geometryScopePassed: Boolean(item.geometry_scope_passed),
  };
}

export function withStageHistory(
  current: Record<string, unknown> | null | undefined,
  next: PipelineStageDetails,
): Record<string, unknown> {
  if (!current || typeof current !== 'object') return { ...next };
  const prev = current as Record<string, unknown>;
  const prevHistory = Array.isArray(prev.history) ? (prev.history as Array<Record<string, unknown>>) : [];
  return {
    ...next,
    history: [...prevHistory, { ...prev, archivedAt: new Date().toISOString() }],
  };
}
