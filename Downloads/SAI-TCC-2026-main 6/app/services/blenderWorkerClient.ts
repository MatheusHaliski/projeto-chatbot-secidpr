export type BlenderWorkerStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface BlenderWorkerJobPayload {
  pieceId: string;
  imageUrl: string;
  jobType: string;
  options: {
    prompt: string;
    type: string;
    mode?: 'model_generation';
    cleanedImagePreprocess?: {
      enabled: boolean;
      autoBrightnessContrast: boolean;
      maxBrightnessGain: number;
      maxContrastGain: number;
      keepQualityGateStrict: boolean;
    };
  };
  modelUrl?: string;
  provider?: 'runpod' | 'meshy';
  userId?: string;
  pieceName?: string;
  prompt?: string;
  quality?: string;
}

interface PieceLikeRecord {
  [key: string]: unknown;
}

const DEFAULT_JOB_TYPE = 'blender_uv_pipeline';

function sanitizeUrl(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPath(source: PieceLikeRecord, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as PieceLikeRecord)[key];
  }, source);
}

function resolvePieceId(piece: PieceLikeRecord): string | null {
  const candidatePaths = [['pieceId'], ['id'], ['piece_id'], ['wardrobe_item_id']];

  for (const path of candidatePaths) {
    const value = readPath(piece, path);
    const id = sanitizeUrl(value);
    if (id) return id;
  }

  return null;
}

export function resolvePieceImageUrl(piece: PieceLikeRecord): string | null {
  const candidatePaths = [
    ['imageUrl'],
    ['image_url'],
    ['imagemUrl'],
    ['photoUrl'],
    ['thumbnailUrl'],
    ['image_assets', 'segmented_png_url'],
    ['image_assets', 'normalized_2d_preview_url'],
    ['image_assets', 'approved_catalog_2d_url'],
    ['image_assets', 'raw_upload_image_url'],
  ];

  for (const path of candidatePaths) {
    const value = readPath(piece, path);
    const url = sanitizeUrl(value);
    if (url) return url;
  }

  return null;
}

function resolvePieceModelUrl(piece: PieceLikeRecord): string | null {
  const candidatePaths = [
    ['modelUrl'],
    ['model_url'],
    ['model_3d_url'],
    ['model_base_3d_url'],
    ['model_branded_3d_url'],
  ];

  for (const path of candidatePaths) {
    const value = readPath(piece, path);
    const modelUrl = sanitizeUrl(value);
    if (modelUrl) return modelUrl;
  }

  return null;
}

export function buildBlenderWorkerSubmitPayload(piece: PieceLikeRecord): BlenderWorkerJobPayload {
  const pieceId = resolvePieceId(piece);
  if (!pieceId) {
    throw new Error('A pieceId is required before starting 3D generation.');
  }

  const imageUrl = resolvePieceImageUrl(piece);
  if (!imageUrl) {
    throw new Error('A valid piece image URL is required before starting 3D generation.');
  }

  const prompt = sanitizeUrl(piece.name) ?? sanitizeUrl(piece.title) ?? 'Unnamed piece';
  const type = sanitizeUrl(piece.piece_type) ?? sanitizeUrl(piece.type) ?? 'unspecified_piece';
  const modelUrl = resolvePieceModelUrl(piece);

  const payload: BlenderWorkerJobPayload = {
    pieceId,
    imageUrl,
    jobType: DEFAULT_JOB_TYPE,
    options: {
      prompt,
      type,
      mode: 'model_generation',
      cleanedImagePreprocess: {
        enabled: true,
        autoBrightnessContrast: true,
        maxBrightnessGain: 0.16,
        maxContrastGain: 0.14,
        keepQualityGateStrict: true,
      },
    },
    pieceName: prompt,
    prompt,
  };

  if (modelUrl) {
    payload.modelUrl = modelUrl;
  }

  return payload;
}

export async function submitBlenderWorkerJob(payload: BlenderWorkerJobPayload): Promise<Record<string, unknown>> {
  if (!payload.pieceId?.trim()) {
    throw new Error('A pieceId is required before starting 3D generation.');
  }

  console.info('[3d-worker-client] submit:start', {
    pieceId: payload.pieceId,
    hasImageUrl: Boolean(payload.imageUrl),
    endpoint: '/api/3d-worker/submit',
  });

  const response = await fetch('/api/3d-worker/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  console.info('[3d-worker-client] submit:response', {
    pieceId: payload.pieceId,
    status: response.status,
    responseJson: body,
  });

  if (!response.ok) {
    const message = typeof body?.message === 'string'
      ? body.message
      : typeof body?.error === 'string'
        ? body.error
        : `Worker submit failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body ?? {};
}

export async function pollBlenderWorkerJob(jobId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/3d-worker/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Worker status poll failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body ?? {};
}

export async function reconcileBlenderWorkerJob(pieceId: string, jobId: string): Promise<Record<string, unknown>> {
  const response = await fetch('/api/3d-worker/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pieceId, jobId }),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  // job_not_found (404) is returned as a payload so the caller can handle
  // it gracefully (fall back to creating a new job) instead of throwing.
  if (response.status === 404 && typeof body?.status === 'string' && body.status === 'job_not_found') {
    return body;
  }

  if (!response.ok) {
    const message =
      typeof body?.message === 'string' ? body.message
        : typeof body?.error === 'string' ? body.error
          : `Reconcile failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body ?? {};
}
