import { NextRequest, NextResponse } from 'next/server';
import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';
import { getAdminStorageBucket } from '@/app/lib/firebaseAdmin';

const RUNNING_STATUSES = new Set(['queued', 'submitted', 'in_progress', 'processing', 'started', 'accepted', 'pending', 'waiting']);
const FAILED_STATUSES = new Set(['failed', 'error', 'errored', 'cancelled', 'canceled', 'timed_out', 'timeout']);

export function resolveWorkerConfig(): { workerUrl: string; token: string } | null {
  const workerUrl = (
    process.env.GPU_WORKER_URL ??
    process.env.BLENDER_CLOUD_API_URL ??
    ''
  ).trim().replace(/\/+$/, '');
  const token = (
    process.env.GPU_WORKER_TOKEN ??
    process.env.BLENDER_WORKER_TOKEN ??
    process.env.BLENDER_CLOUD_API_TOKEN ??
    ''
  ).trim();
  if (!workerUrl || !token) return null;
  return { workerUrl, token };
}

async function downloadArtifact(
  workerUrl: string,
  token: string,
  jobId: string,
  filename: string,
): Promise<Buffer | null> {
  try {
    const res = await fetch(`${workerUrl}/artifacts/${jobId}/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function uploadToFirebase(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const bucket = getAdminStorageBucket();
  const file = bucket.file(storagePath);
  const token = crypto.randomUUID();
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
    resumable: false,
    public: false,
    validation: 'md5',
  });
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}

export type ReconcileOutcome =
  | { ok: true; status: 'processing'; jobId: string; rawStatus: string }
  | { ok: false; status: 'failed'; jobId: string; rawStatus: string; error: unknown }
  | { ok: true; status: 'completed'; jobId: string; model_3d_url: string; model_base_3d_url: string | null; model_usdz_url: string | null; model_preview_url: string | null }
  | { ok: false; status: 'error'; error: string }
  | { ok: false; status: 'job_not_found'; jobId: string; error: string; diagnostics?: Record<string, unknown> };

export async function reconcileJob(pieceId: string, jobId: string): Promise<ReconcileOutcome> {
  const worker = resolveWorkerConfig();
  if (!worker) {
    return { ok: false, status: 'error', error: 'GPU_WORKER_URL and GPU_WORKER_TOKEN must be set' };
  }

  const abort = new AbortController();
  const abortTimer = setTimeout(() => abort.abort(), 15_000);
  let workerRes: Response;
  try {
    workerRes = await fetch(`${worker.workerUrl}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${worker.token}` },
      cache: 'no-store',
      signal: abort.signal,
    });
  } catch (err) {
    clearTimeout(abortTimer);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 'error', error: `worker_unreachable: ${msg}` };
  } finally {
    clearTimeout(abortTimer);
  }

  if (!workerRes.ok) {
    const body = await workerRes.text().catch(() => '');
    if (workerRes.status === 404) {
      // The worker returned 404 for this jobId. This means either:
      //   a) The worker restarted and lost its in-memory job registry, OR
      //   b) The jobId stored in cloud_job_id was never a valid RunPod worker job
      //      (e.g. a Meshy task ID or a Firestore piece ID leaked into cloud_job_id).
      //
      // Do NOT attempt to download /artifacts/{jobId} — if the ID is wrong, that
      // endpoint will also 404 and we would be masking the real problem.
      // Surface a clear diagnostic instead so the caller can restart the job.
      console.warn('[3d-worker/reconcile] job_not_found: RunPod worker returned 404', {
        pieceId,
        jobId,
        errorCode: 'INVALID_WORKER_JOB_ID',
        hint: 'The app polled a job ID the RunPod worker does not recognise. Likely cause: a Meshy task ID or piece ID was stored as cloud_job_id. Start a new generation job.',
      });
      return {
        ok: false,
        status: 'job_not_found',
        jobId,
        error: `The app is polling a job ID that the RunPod worker does not know (jobId=${jobId}). Start a new generation job.`,
        diagnostics: { errorCode: 'INVALID_WORKER_JOB_ID', usedJobId: jobId },
      } as ReconcileOutcome;
    }
    return { ok: false, status: 'error', error: `worker_error: HTTP ${workerRes.status} — ${body.slice(0, 300)}` };
  }

  const jobData = await workerRes.json() as Record<string, unknown>;
  const rawStatus = String(jobData.status ?? '').toLowerCase().trim();

  if (RUNNING_STATUSES.has(rawStatus)) {
    return { ok: true, status: 'processing', jobId, rawStatus };
  }

  const repo = new WardrobeItemsRepository();

  if (FAILED_STATUSES.has(rawStatus)) {
    // Python worker stores code/stage/details at the top level of the job dict.
    // A JS-originated worker may nest them inside an `error` object instead.
    const nestedError =
      jobData.error && typeof jobData.error === 'object'
        ? (jobData.error as Record<string, unknown>)
        : null;

    const workerCode = nestedError
      ? String(nestedError.code ?? '')
      : String(jobData.code ?? '');
    const errorMsg = nestedError
      ? String(nestedError.message ?? `RunPod job ${rawStatus}`)
      : typeof jobData.error === 'string' && jobData.error.trim()
        ? jobData.error.trim()
        : `RunPod job ${rawStatus}`;
    const errorStage = String(jobData.stage ?? nestedError?.stage ?? '');
    const errorDetails = nestedError
      ? ((nestedError.details as Record<string, unknown> | undefined) ?? {})
      : ((jobData.details as Record<string, unknown> | undefined) ?? {});

    const isDnsFailure = workerCode === 'dns_resolution_failure';
    const isMeshyFailure = !isDnsFailure && workerCode.startsWith('meshy_');
    const failedStage = errorStage || (isDnsFailure ? 'network_dns' : isMeshyFailure ? 'meshy_generate' : 'runpod_worker_failure');

    await repo.updatePipelineStatus(pieceId, 'failed', errorMsg, {
      stage: 'failed',
      failedStage,
      provider: 'runpod',
      errorCode: isDnsFailure ? 'DNS_RESOLUTION_FAILED' : workerCode.toUpperCase() || 'WORKER_FAILED',
      ...(isDnsFailure ? { kind: 'dns_resolution_failure' } : {}),
      retryable: true,
      diagnostics: { ...errorDetails, workerStage: errorStage || undefined },
    });

    return { ok: false, status: 'failed', jobId, rawStatus, error: nestedError ?? { code: workerCode, message: errorMsg, stage: errorStage } };
  }

  if (rawStatus === 'completed' || rawStatus === 'succeeded' || rawStatus === 'done' || rawStatus === 'success') {
    const piece = await repo.findById(pieceId);
    if (!piece) {
      return { ok: false, status: 'error', error: 'piece_not_found' };
    }

    const userId = String(piece.user_id ?? piece.userId ?? '');
    if (!userId) {
      return { ok: false, status: 'error', error: 'piece_missing_userId' };
    }

    // Extract meshy_task_id from worker metrics — store it separately from
    // cloud_job_id so the two IDs are never confused in Firestore.
    const metrics = jobData.metrics && typeof jobData.metrics === 'object'
      ? (jobData.metrics as Record<string, unknown>)
      : {};
    const meshyTaskId = typeof metrics.meshyTaskId === 'string' && metrics.meshyTaskId.trim()
      ? metrics.meshyTaskId.trim()
      : null;

    const debug = jobData.debug && typeof jobData.debug === 'object'
      ? (jobData.debug as Record<string, unknown>)
      : {};
    const debugSteps = debug.steps && typeof debug.steps === 'object'
      ? (debug.steps as Record<string, unknown>)
      : {};
    const meshyStep = debugSteps.meshy && typeof debugSteps.meshy === 'object'
      ? (debugSteps.meshy as Record<string, unknown>)
      : {};
    const previewUrl = String(meshyStep.thumbnail_url ?? '').trim() || null;

    const storageBase = `wardrobe-3d-models/${userId}/${pieceId}/${jobId}`;

    console.info('[3d-worker] job_completed', { pieceId, jobId });
    console.info('[artifact-publish] downloading final_model.glb from worker', { jobId });
    const glbBuf = await downloadArtifact(worker.workerUrl, worker.token, jobId, 'final_model.glb');
    if (!glbBuf) {
      return { ok: false, status: 'error', error: 'artifact_download_failed: final_model.glb' };
    }
    const finalModelPath = `${storageBase}/final_model.glb`;
    const finalModelUrl = await uploadToFirebase(finalModelPath, glbBuf, 'model/gltf-binary');
    console.info('[artifact-publish] uploaded', { firebasePath: finalModelPath });
    console.info('[artifact-publish] publicUrl', { publicUrl: finalModelUrl });

    const baseBuf = await downloadArtifact(worker.workerUrl, worker.token, jobId, 'base_meshy.glb');
    const baseModelUrl = baseBuf
      ? await uploadToFirebase(`${storageBase}/base_meshy.glb`, baseBuf, 'model/gltf-binary')
      : null;

    const usdzBuf = await downloadArtifact(worker.workerUrl, worker.token, jobId, 'final_model.usdz');
    const usdzUrl = usdzBuf
      ? await uploadToFirebase(`${storageBase}/final_model.usdz`, usdzBuf, 'model/vnd.usdz+zip')
      : null;


    const debugBuf = await downloadArtifact(worker.workerUrl, worker.token, jobId, 'debug.json');
    const debugUrl = debugBuf
      ? await uploadToFirebase(`${storageBase}/debug.json`, debugBuf, 'application/json')
      : null;

    let resolvedPreviewUrl = previewUrl;
    if (!resolvedPreviewUrl) {
      const pngBuf = await downloadArtifact(worker.workerUrl, worker.token, jobId, 'preview.png');
      if (pngBuf) {
        resolvedPreviewUrl = await uploadToFirebase(`${storageBase}/preview.png`, pngBuf, 'image/png');
      }
    }

    await repo.updateCompletedModel(
      pieceId,
      {
        model_3d_url: finalModelUrl,
        model_base_3d_url: baseModelUrl,
        model_usdz_url: usdzUrl,
        model_preview_url: resolvedPreviewUrl,
        meshy_task_id: meshyTaskId,
      },
      jobId,
    );

    const completedAt = new Date().toISOString();
    await repo.updatePipelineStatus(pieceId, 'completed', null, {
      current: {
        provider: 'runpod',
        stage: 'completed',
        runpod_job_id: jobId,
        meshyTaskId,
        durationMs: Number(metrics.durationMs ?? 0) || null,
        completedAt,
        artifacts: {
          internal: jobData.artifacts ?? null,
          public: {
            model_3d_url: finalModelUrl,
            model_base_3d_url: baseModelUrl,
            model_usdz_url: usdzUrl,
            model_preview_url: resolvedPreviewUrl,
            debug_report_url: debugUrl,
          },
        },
      },
    });
    console.info('[firestore] piece model_status=completed model_3d_url_saved=true', { pieceId, jobId });

    console.info('[3d-worker/reconcile] model completed and synced', {
      pieceId,
      jobId,
      finalModelUrl,
      baseModelUrl,
      usdzUrl,
      previewUrl: resolvedPreviewUrl,
    });

    return {
      ok: true,
      status: 'completed',
      jobId,
      model_3d_url: finalModelUrl,
      model_base_3d_url: baseModelUrl,
      model_usdz_url: usdzUrl,
      model_preview_url: resolvedPreviewUrl,
    };
  }

  return { ok: true, status: 'processing', jobId, rawStatus };
}

export async function GET(req: NextRequest) {
  const pieceId = req.nextUrl.searchParams.get('pieceId')?.trim() ?? '';
  const jobId = req.nextUrl.searchParams.get('jobId')?.trim() ?? '';

  if (!pieceId || !jobId) {
    return NextResponse.json(
      { ok: false, error: 'pieceId and jobId are required' },
      { status: 400 },
    );
  }

  if (!resolveWorkerConfig()) {
    return NextResponse.json(
      { ok: false, error: 'GPU_WORKER_URL and GPU_WORKER_TOKEN must be set' },
      { status: 500 },
    );
  }

  const result = await reconcileJob(pieceId, jobId);

  if (result.status === 'error') {
    const errResult = result as { ok: false; status: 'error'; error: string };
    const isUnreachable = errResult.error.startsWith('worker_unreachable');
    return NextResponse.json(errResult, { status: isUnreachable ? 503 : 502 });
  }

  if (result.status === 'job_not_found') {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
