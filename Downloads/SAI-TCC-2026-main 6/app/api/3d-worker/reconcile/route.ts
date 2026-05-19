/**
 * POST /api/3d-worker/reconcile — single-job reconcile (used by frontend polling)
 *   body: { pieceId: string, jobId: string }
 *
 * GET  /api/3d-worker/reconcile — batch auto-recovery (called by Vercel cron every 5 min)
 *   Scans all pieces stuck in model_status="processing" for >10 min and recovers
 *   each job based on the stage recorded in worker_jobs/{jobId}.
 *   Protected by CRON_SECRET env var (Vercel injects Authorization: Bearer <secret>).
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebaseAdmin';
import { reconcileJob, resolveWorkerConfig } from '@/app/api/3d-worker/status/route';
import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';

// ── Single-job reconcile (existing behaviour, used by frontend) ─────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const pieceId = String(body.pieceId ?? '').trim();
  const jobId = String(body.jobId ?? '').trim();

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

  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[3d-worker/reconcile] unexpected error', { pieceId, jobId, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// ── Batch auto-recovery (Vercel cron) ───────────────────────────────────────

const STALL_TTL_MS = 10 * 60 * 1000;        // 10 minutes — matches the UI TTL
const QUEUE_STALL_TTL_MS = 5 * 60 * 1000;   // 5 minutes for stuck-queued jobs

type RecoveryAction = 'reconcile_completed' | 'resubmit' | 'reset_pending' | 'skipped';

interface RecoveryResult {
  pieceId: string;
  jobId: string;
  workerJobsStatus: string | null;
  action: RecoveryAction;
  detail: string;
}

async function pollMeshyTask(
  meshyTaskId: string,
): Promise<{ succeeded: boolean; glbUrl: string | null; failed: boolean }> {
  const meshyApiKey = process.env.MESHY_API_KEY?.trim() ?? '';
  if (!meshyApiKey) return { succeeded: false, glbUrl: null, failed: false };

  const baseUrl = (process.env.MESHY_BASE_URL || 'https://api.meshy.ai')
    .trim().replace(/\/+$/, '')
    .replace('/openapi/v1/image-to-3d', '')
    .replace('/openapi/v1', '');
  const pollUrl = `${baseUrl}/openapi/v1/image-to-3d/${meshyTaskId}`;

  try {
    const res = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${meshyApiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return { succeeded: false, glbUrl: null, failed: res.status >= 400 };
    const data = await res.json() as Record<string, unknown>;
    const status = String(data.status ?? '').toLowerCase();
    if (['succeeded', 'success', 'completed'].includes(status)) {
      const urls = (data.model_urls ?? {}) as Record<string, string>;
      const glbUrl = urls.glb ?? urls.obj ?? null;
      return { succeeded: true, glbUrl, failed: false };
    }
    if (['failed', 'error', 'cancelled'].includes(status)) {
      return { succeeded: false, glbUrl: null, failed: true };
    }
    return { succeeded: false, glbUrl: null, failed: false };
  } catch {
    return { succeeded: false, glbUrl: null, failed: false };
  }
}

async function resubmitJobToWorker(
  worker: { workerUrl: string; token: string },
  pieceId: string,
  imageUrl: string,
  meshyGlbUrl?: string | null,
): Promise<string | null> {
  const payload: Record<string, unknown> = { pieceId };
  if (meshyGlbUrl) {
    payload.meshyGlbUrl = meshyGlbUrl;
  } else {
    payload.imageUrl = imageUrl;
  }

  try {
    const res = await fetch(`${worker.workerUrl}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${worker.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const jobId = data.jobId ?? data.id;
    return typeof jobId === 'string' && jobId.trim() ? jobId.trim() : null;
  } catch {
    return null;
  }
}

async function recoverStalledPiece(
  pieceDoc: FirebaseFirestore.QueryDocumentSnapshot,
  worker: { workerUrl: string; token: string } | null,
): Promise<RecoveryResult> {
  const data = pieceDoc.data() as Record<string, unknown>;
  const pieceId = pieceDoc.id;
  const cloudJobId = String(data.cloud_job_id ?? data.runpod_job_id ?? '').trim();
  const repo = new WardrobeItemsRepository();

  const resetToPending = async (detail: string): Promise<RecoveryResult> => {
    await adminDb.collection('sai-wardrobeItems').doc(pieceId).update({
      model_status: 'pending',
      model_generation_error: detail,
      updated_at: new Date().toISOString(),
    });
    return { pieceId, jobId: cloudJobId, workerJobsStatus: null, action: 'reset_pending', detail };
  };

  if (!cloudJobId) {
    return resetToPending('No cloud_job_id recorded — reset to pending so user can retry');
  }

  // Look up the worker_jobs document written by the Python worker
  let workerJobData: Record<string, unknown> | null = null;
  try {
    const wjDoc = await adminDb.collection('worker_jobs').doc(cloudJobId).get();
    workerJobData = wjDoc.exists ? (wjDoc.data() as Record<string, unknown>) : null;
  } catch {
    // Firestore read failed — fall through to reset
  }

  const workerJobsStatus = workerJobData ? String(workerJobData.status ?? '') : null;

  // ── Case 1: no worker_jobs record ────────────────────────────────────────
  if (!workerJobData) {
    return resetToPending('No worker_jobs record found after stall — pod likely restarted before writing state');
  }

  // ── Case 2: blender_running or succeeded — try artifact download ─────────
  if (workerJobsStatus === 'blender_running' || workerJobsStatus === 'succeeded') {
    if (!worker) {
      return resetToPending('Worker URL not configured — cannot check artifacts');
    }
    try {
      const result = await reconcileJob(pieceId, cloudJobId);
      if (result.status === 'completed') {
        return { pieceId, jobId: cloudJobId, workerJobsStatus, action: 'reconcile_completed', detail: 'Artifact downloaded and uploaded successfully' };
      }
      if (result.status === 'failed' || result.status === 'job_not_found') {
        return resetToPending(`Worker reconcile returned ${result.status}`);
      }
      // still processing — not yet stalled enough, skip
      return { pieceId, jobId: cloudJobId, workerJobsStatus, action: 'skipped', detail: `Worker still reports status=${result.status}` };
    } catch (err) {
      return resetToPending(`Artifact reconcile threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Case 3: meshy_polling — re-poll Meshy ────────────────────────────────
  if (workerJobsStatus === 'meshy_polling') {
    const meshyTaskId = String(workerJobData.meshyTaskId ?? '').trim();
    if (!meshyTaskId) {
      return resetToPending('meshy_polling state but no meshyTaskId stored');
    }

    const meshyResult = await pollMeshyTask(meshyTaskId);

    if (meshyResult.succeeded && meshyResult.glbUrl && worker) {
      // Meshy finished — re-submit to the GPU worker with the GLB URL, skipping Meshy
      const imageUrl = String(data.image_url ?? '').trim();
      const newJobId = await resubmitJobToWorker(worker, pieceId, imageUrl, meshyResult.glbUrl);
      if (newJobId) {
        await repo.updateProcessingState(pieceId, newJobId);
        return { pieceId, jobId: newJobId, workerJobsStatus, action: 'resubmit', detail: `Meshy succeeded; re-submitted to worker with GLB URL, new jobId=${newJobId}` };
      }
      return resetToPending('Meshy succeeded but worker resubmit failed');
    }

    if (meshyResult.failed) {
      return resetToPending('Meshy task failed or was cancelled — reset to pending');
    }

    // Meshy still in-progress or MESHY_API_KEY not configured — leave as-is for now
    return { pieceId, jobId: cloudJobId, workerJobsStatus, action: 'skipped', detail: 'Meshy task still in progress or API key not configured' };
  }

  // ── Case 4: queued for > 5 min — re-submit ───────────────────────────────
  if (workerJobsStatus === 'queued') {
    const createdAt = String(workerJobData.createdAt ?? workerJobData.updatedAt ?? '').trim();
    const age = createdAt ? Date.now() - new Date(createdAt).getTime() : Infinity;
    if (age < QUEUE_STALL_TTL_MS) {
      return { pieceId, jobId: cloudJobId, workerJobsStatus, action: 'skipped', detail: 'Queued job is not yet stale (< 5 min)' };
    }

    if (!worker) return resetToPending('Worker URL not configured — cannot resubmit');

    const imageUrl = String(data.image_url ?? '').trim();
    if (!imageUrl) return resetToPending('No image_url on piece — cannot resubmit');

    const newJobId = await resubmitJobToWorker(worker, pieceId, imageUrl);
    if (newJobId) {
      await repo.updateProcessingState(pieceId, newJobId);
      return { pieceId, jobId: newJobId, workerJobsStatus, action: 'resubmit', detail: `Stale queued job; re-submitted, new jobId=${newJobId}` };
    }
    return resetToPending('Worker resubmit failed for stale queued job');
  }

  // ── Case 5: already failed/succeeded in worker_jobs ─────────────────────
  if (workerJobsStatus === 'failed') {
    return resetToPending(`worker_jobs status=failed errorCode=${workerJobData.errorCode ?? 'unknown'}`);
  }

  // Unknown status — reset to pending
  return resetToPending(`Unknown worker_jobs status: ${workerJobsStatus}`);
}

interface AutoResubmitResult {
  pieceId: string;
  fromStatus: string;
  action: 'resubmitted' | 'skipped' | 'failed';
  newJobId?: string;
  detail: string;
}

const MAX_AUTO_RETRY_ATTEMPTS = 5;

export async function GET(req: NextRequest) {
  // Protect the cron endpoint with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const worker = resolveWorkerConfig();
  const tenMinutesAgo = new Date(Date.now() - STALL_TTL_MS).toISOString();

  // ── Phase 1: recover stalled "processing" pieces ─────────────────────────
  // Requires composite index: sai-wardrobeItems / model_status ASC + processingStartedAt ASC
  let stalledSummary: RecoveryResult[] = [];
  let stalledCount = 0;
  let stalledCounts: Record<string, number> = {};

  try {
    const stalledDocs = await adminDb
      .collection('sai-wardrobeItems')
      .where('model_status', '==', 'processing')
      .where('processingStartedAt', '<', tenMinutesAgo)
      .get();

    stalledCount = stalledDocs.size;

    if (!stalledDocs.empty) {
      console.info('[reconcile/batch] found stalled pieces', { count: stalledDocs.size, olderThan: tenMinutesAgo });

      const settled = await Promise.allSettled(
        stalledDocs.docs.map((doc) => recoverStalledPiece(doc, worker)),
      );

      stalledSummary = settled.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const pieceId = stalledDocs.docs[i]?.id ?? 'unknown';
        return { pieceId, jobId: '', workerJobsStatus: null, action: 'skipped' as RecoveryAction, detail: `Unhandled error: ${r.reason}` };
      });

      stalledCounts = stalledSummary.reduce<Record<string, number>>((acc, r) => {
        acc[r.action] = (acc[r.action] ?? 0) + 1;
        return acc;
      }, {});

      console.info('[reconcile/batch] recovery complete', { counts: stalledCounts, total: stalledSummary.length });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reconcile/batch] stalled-processing query failed', { error: msg });
    // Non-fatal: continue to auto-resubmit phase
  }

  // ── Phase 2: auto-resubmit "pending" and retryable "failed" pieces ────────
  // "pending"  → the cron itself resets jobs here when they are lost; always retry.
  // "failed"   → only retry when pipeline_stage_details.diagnostics.retryable === true.
  // Both:       skip if generation_attempt_count >= MAX_AUTO_RETRY_ATTEMPTS.
  let autoResubmitResults: AutoResubmitResult[] = [];

  if (!worker) {
    console.warn('[reconcile/batch] worker not configured — skipping auto-resubmit');
  } else {
    try {
      const candidateDocs = await adminDb
        .collection('sai-wardrobeItems')
        .where('model_status', 'in', ['pending', 'failed'])
        .get();

      const candidates = candidateDocs.docs.filter((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const imageUrl = String(data.image_url ?? '').trim();
        const preparationStatus = String(data.preparationStatus ?? '').trim();
        const attemptCount = Number(data.generation_attempt_count ?? 0);

        if (!imageUrl || preparationStatus !== 'ready') return false;
        if (attemptCount >= MAX_AUTO_RETRY_ATTEMPTS) return false;

        if (data.model_status === 'failed') {
          const diagnostics = (
            (data.pipeline_stage_details as Record<string, unknown> | null)
              ?.diagnostics as Record<string, unknown> | null
          ) ?? {};
          return diagnostics.retryable === true;
        }

        return true; // pending → always retry
      });

      if (candidates.length > 0) {
        console.info('[reconcile/batch] auto-resubmit candidates', { count: candidates.length });
      }

      const resubmitSettled = await Promise.allSettled(
        candidates.map(async (doc): Promise<AutoResubmitResult> => {
          const data = doc.data() as Record<string, unknown>;
          const pieceId = doc.id;
          const fromStatus = String(data.model_status ?? '');
          const imageUrl = String(data.image_url ?? '').trim();
          const currentAttempts = Number(data.generation_attempt_count ?? 0);

          const newJobId = await resubmitJobToWorker(worker, pieceId, imageUrl);
          if (!newJobId) {
            return { pieceId, fromStatus, action: 'failed', detail: 'Worker resubmit returned no jobId' };
          }

          const repo = new WardrobeItemsRepository();
          await repo.updateProcessingState(pieceId, newJobId);
          await adminDb.collection('sai-wardrobeItems').doc(pieceId).update({
            generation_attempt_count: currentAttempts + 1,
          });

          console.info('[reconcile/batch] auto-resubmitted', { pieceId, fromStatus, newJobId, attempt: currentAttempts + 1 });
          return {
            pieceId,
            fromStatus,
            action: 'resubmitted',
            newJobId,
            detail: `Auto-resubmitted from "${fromStatus}", attempt ${currentAttempts + 1} of ${MAX_AUTO_RETRY_ATTEMPTS}`,
          };
        }),
      );

      autoResubmitResults = resubmitSettled.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const pieceId = candidates[i]?.id ?? 'unknown';
        return { pieceId, fromStatus: 'unknown', action: 'failed' as const, detail: `Error: ${r.reason}` };
      });

      if (autoResubmitResults.length > 0) {
        const resubmitCounts = autoResubmitResults.reduce<Record<string, number>>((acc, r) => {
          acc[r.action] = (acc[r.action] ?? 0) + 1;
          return acc;
        }, {});
        console.info('[reconcile/batch] auto-resubmit complete', { counts: resubmitCounts });
      }
    } catch (err) {
      console.error('[reconcile/batch] auto-resubmit query failed', { error: String(err) });
    }
  }

  return NextResponse.json({
    ok: true,
    stalled: stalledCount,
    counts: stalledCounts,
    results: stalledSummary,
    autoResubmit: {
      total: autoResubmitResults.length,
      results: autoResubmitResults,
    },
  });
}
