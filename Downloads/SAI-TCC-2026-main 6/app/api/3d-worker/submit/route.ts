import { NextResponse } from 'next/server';
import {
  WorkerProvider,
  logStage,
  safeFetchJson,
  StructuredStageError,
  toErrorPayload,
  truncateText,
} from '@/app/api/3d-worker/utils';
import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';

type SubmitBody = Record<string, unknown>;

interface RunpodConfig {
  submitUrl: string;
  token: string;
  pathUsed: string;
  payloadMode: 'direct' | 'serverless_input_wrapper';
  baseUrl: string;
}

function normalizeUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

function buildMeshyCreateUrl(rawBase: string): string {
  let base = (rawBase || 'https://api.meshy.ai').trim().replace(/\/+$/, '');
  base = base.replace('/openapi/v1/image-to-3d', '');
  base = base.replace('/openapi/v1', '');
  return `${base}/openapi/v1/image-to-3d`;
}

function chooseProvider(bodyProvider: unknown): WorkerProvider {
  if (typeof bodyProvider === 'string') {
    const normalized = bodyProvider.trim().toLowerCase();
    // Only honour an explicit 'meshy' override when no RunPod worker is configured.
    // When GPU_WORKER_URL is set, RunPod is the entry-point and handles Meshy
    // internally — the Meshy task ID must never leak out as a RunPod job ID.
    if (normalized === 'runpod') return 'runpod';
    if (normalized === 'meshy') {
      const gpuWorkerUrl = normalizeUrl(process.env.GPU_WORKER_URL);
      const gpuWorkerToken = process.env.GPU_WORKER_TOKEN?.trim() ?? '';
      if (!gpuWorkerUrl || !gpuWorkerToken) return 'meshy';
    }
  }

  // Prefer the RunPod worker when it is configured: it handles Meshy internally
  // and returns a stable runpod_job_id that the reconcile route can poll safely.
  const gpuWorkerUrl = normalizeUrl(process.env.GPU_WORKER_URL);
  const gpuWorkerToken = process.env.GPU_WORKER_TOKEN?.trim() ?? '';
  const runpodEndpointUrl = normalizeUrl(process.env.RUNPOD_ENDPOINT_URL);
  const runpodApiKey = process.env.RUNPOD_API_KEY?.trim() ?? '';
  if ((gpuWorkerUrl && gpuWorkerToken) || (runpodEndpointUrl && runpodApiKey)) {
    return 'runpod';
  }

  if (process.env.MESHY_API_KEY?.trim()) {
    return 'meshy';
  }

  return 'runpod';
}

function requiredEnvForProvider(provider: WorkerProvider): string[] {
  const missing: string[] = [];
  const gpuWorkerUrl = normalizeUrl(process.env.GPU_WORKER_URL);
  const gpuWorkerToken = process.env.GPU_WORKER_TOKEN?.trim() ?? '';
  const runpodEndpointUrl = normalizeUrl(process.env.RUNPOD_ENDPOINT_URL || process.env.BLENDER_CLOUD_API_URL);
  const runpodApiKey = process.env.RUNPOD_API_KEY?.trim() ?? process.env.BLENDER_CLOUD_API_TOKEN?.trim() ?? '';
  const meshyApiKey = process.env.MESHY_API_KEY?.trim() ?? '';

  if (provider === 'runpod') {
    const hasPodConfig = Boolean(gpuWorkerUrl && gpuWorkerToken);
    const hasServerlessConfig = Boolean(runpodEndpointUrl && runpodApiKey);

    if (!hasPodConfig && !hasServerlessConfig) {
      if (!gpuWorkerUrl) missing.push('GPU_WORKER_URL');
      if (!gpuWorkerToken) missing.push('GPU_WORKER_TOKEN');
      if (!runpodEndpointUrl) missing.push('RUNPOD_ENDPOINT_URL');
      if (!runpodApiKey) missing.push('RUNPOD_API_KEY');
    }
  }

  if (provider === 'meshy' && !meshyApiKey) {
    missing.push('MESHY_API_KEY');
  }

  return missing;
}

function getRunpodConfig(): RunpodConfig {
  const gpuWorkerUrl = normalizeUrl(process.env.GPU_WORKER_URL || process.env.BLENDER_CLOUD_API_URL);
  const gpuWorkerToken = process.env.GPU_WORKER_TOKEN?.trim() ?? process.env.BLENDER_CLOUD_API_TOKEN?.trim() ?? '';
  const runpodEndpointUrl = normalizeUrl(process.env.RUNPOD_ENDPOINT_URL);
  const runpodApiKey = process.env.RUNPOD_API_KEY?.trim() ?? '';
  const submitPathOverride = (process.env.BLENDER_CLOUD_SUBMIT_PATH?.trim() || '').replace(/\/+$/, '');

  if (gpuWorkerUrl && gpuWorkerToken) {
    const pathUsed = submitPathOverride || '/jobs';
    return {
      submitUrl: `${gpuWorkerUrl}${pathUsed.startsWith('/') ? pathUsed : `/${pathUsed}`}`,
      token: gpuWorkerToken,
      pathUsed,
      payloadMode: 'direct',
      baseUrl: gpuWorkerUrl,
    };
  }

  if (runpodEndpointUrl && runpodApiKey) {
    const pathUsed = submitPathOverride || '/run';
    return {
      submitUrl: `${runpodEndpointUrl}${pathUsed.startsWith('/') ? pathUsed : `/${pathUsed}`}`,
      token: runpodApiKey,
      pathUsed,
      payloadMode: 'serverless_input_wrapper',
      baseUrl: runpodEndpointUrl,
    };
  }

  throw new Error('RunPod environment not configured.');
}

async function runpodRouteDiagnostics(baseUrl: string, token: string) {
  const authHeaders: HeadersInit | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;
  const getProbe = async (path: string) => {
    try {
      const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers: authHeaders, cache: 'no-store' });
      const text = truncateText(await res.text());
      return { path, ok: res.ok, status: res.status, bodyPreview: text };
    } catch (error) {
      return { path, ok: false, status: null, bodyPreview: error instanceof Error ? error.message : String(error) };
    }
  };
  const postProbe = async (path: string, payload: unknown) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const text = truncateText(await res.text());
      return { path, ok: res.ok, status: res.status, bodyPreview: text };
    } catch (error) {
      return { path, ok: false, status: null, bodyPreview: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    ping: await getProbe('/ping'),
    openapi: await getProbe('/openapi.json'),
    jobsProbe: await postProbe('/jobs', { healthCheck: true }),
    runProbe: await postProbe('/run', { input: { healthCheck: true } }),
  };
}

function normalizeJobId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  // Meshy returns the task id in `result`; RunPod uses `jobId` / `id` / `taskId`
  const candidate = data.result ?? data.jobId ?? data.id ?? data.taskId ?? (data.data as Record<string, unknown> | undefined)?.id;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function normalizeStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const candidate = data.status ?? data.state ?? (data.data as Record<string, unknown> | undefined)?.status;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

export async function POST(req: Request) {
  const stageBase = 'submit_proxy';
  logStage('incoming_request', {
    method: req.method,
  });

  let body: SubmitBody;
  try {
    const parsed = await req.json();
    body = (parsed && typeof parsed === 'object' ? parsed : null) as SubmitBody;
  } catch (error) {
    logStage('invalid_json', {
      stage: `${stageBase}_body_parse`,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        stage: 'request_validation',
        provider: 'fallback',
        message: 'Invalid JSON payload.',
        status: 400,
        details: { missing: ['pieceId', 'imageUrl'] },
        hint: 'Send a JSON body with pieceId and imageUrl.',
      },
      { status: 400 },
    );
  }

  const bodyKeys = Object.keys(body ?? {});
  const pieceId = typeof body.pieceId === 'string' ? body.pieceId.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const provider = chooseProvider(body.provider);

  logStage('request_body_summary', {
    bodyKeys,
    pieceId,
    hasImageUrl: Boolean(imageUrl),
    providerSelected: provider,
    hasGpuWorkerUrl: Boolean(normalizeUrl(process.env.GPU_WORKER_URL)),
    hasGpuWorkerToken: Boolean(process.env.GPU_WORKER_TOKEN?.trim()),
    hasRunpodEndpointUrl: Boolean(normalizeUrl(process.env.RUNPOD_ENDPOINT_URL)),
    hasRunpodApiKey: Boolean(process.env.RUNPOD_API_KEY?.trim()),
    hasMeshyApiKey: Boolean(process.env.MESHY_API_KEY?.trim()),
    hasMeshyBaseUrl: Boolean(normalizeUrl(process.env.MESHY_BASE_URL)),
  });

  const missingRequestFields: string[] = [];
  if (!pieceId) missingRequestFields.push('pieceId');
  if (!imageUrl) missingRequestFields.push('imageUrl');

  if (missingRequestFields.length > 0) {
    const pieceIdMissing = missingRequestFields.includes('pieceId');
    return NextResponse.json(
      {
        ok: false,
        stage: 'request_validation',
        provider,
        message: pieceIdMissing
          ? 'A pieceId is required before starting 3D generation.'
          : 'Invalid request body.',
        status: 400,
        details: { missing: missingRequestFields },
        hint: pieceIdMissing
          ? 'Provide pieceId from the wardrobe item before submitting the 3D job.'
          : 'Required fields: pieceId, imageUrl.',
      },
      { status: 400 },
    );
  }

  const missingEnv = requiredEnvForProvider(provider);
  if (missingEnv.length > 0) {
    const onlyAuthMissing = missingEnv.every((entry) => entry.includes('TOKEN') || entry.includes('API_KEY'));
    return NextResponse.json(
      {
        ok: false,
        failedStage: onlyAuthMissing ? 'auth_config_missing' : 'env_validation',
        provider,
        message: 'Missing required environment configuration.',
        status: 500,
        missing: missingEnv,
        details: { missing: missingEnv },
        hint: 'Set the missing environment variables on the Next.js server runtime.',
      },
      { status: 500 },
    );
  }

  // Idempotency guard: if this piece already has an active job, return it instead of
  // creating a duplicate. This prevents the race condition where the UI, the reconcile
  // cron, or multiple browser tabs all call submit concurrently for the same piece.
  if (pieceId) {
    const repo = new WardrobeItemsRepository();
    const existing = await repo.findById(pieceId).catch(() => null);
    const existingJobId = typeof existing?.cloud_job_id === 'string' ? existing.cloud_job_id.trim() : '';
    if (existing && existing.model_status === 'processing' && existingJobId) {
      logStage('idempotent_return', { pieceId, existingJobId });
      return NextResponse.json({
        ok: true,
        provider,
        status: 'queued',
        jobId: existingJobId,
        runpod_job_id: existingJobId,
        idempotent: true,
      });
    }
  }

  try {
    if (provider === 'meshy') {
      const meshyUrl = buildMeshyCreateUrl(normalizeUrl(process.env.MESHY_BASE_URL));
      const meshyToken = process.env.MESHY_API_KEY?.trim() ?? '';
      const prompt = typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : undefined;
      const payload: Record<string, unknown> = {
        image_url: imageUrl,
        should_texture: true,
        ...(prompt ? { prompt } : {}),
      };

      logStage('submit_target', {
        provider,
        finalSubmitUrl: meshyUrl,
        submitPathUsed: '/openapi/v1/image-to-3d',
        payloadModeUsed: 'meshy_image_to_3d',
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      const result = await (async () => {
        try {
          return await safeFetchJson(
            meshyUrl,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${meshyToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
              cache: 'no-store',
              signal: controller.signal,
            },
            'meshy_submit',
            provider,
          );
        } finally {
          clearTimeout(timeout);
        }
      })();

      const jobId = normalizeJobId(result.parsedJson);
      const status = normalizeStatus(result.parsedJson) ?? 'queued';

      logStage('normalized_response', {
        provider,
        responseStatus: result.status,
        responseContentType: result.contentType,
        rawResponseTextTruncated: truncateText(result.rawText),
        parsedResponseJson: result.parsedJson,
        normalizedJobId: jobId,
        normalizedStatus: status,
      });

      return NextResponse.json(
        {
          ok: true,
          provider,
          status,
          jobId,
          upstream: result.parsedJson,
        },
        { status: 200 },
      );
    }

    const runpod = getRunpodConfig();
    const outboundPayload =
      runpod.payloadMode === 'serverless_input_wrapper' ? { input: body } : body;

    logStage('submit_target', {
      provider,
      finalSubmitUrl: runpod.submitUrl,
      submitPathUsed: runpod.pathUsed,
      payloadModeUsed: runpod.payloadMode,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    const result = await (async () => {
      try {
        return await safeFetchJson(
          runpod.submitUrl,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${runpod.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(outboundPayload),
            cache: 'no-store',
            signal: controller.signal,
          },
          'runpod_submit',
          provider,
        );
      } finally {
        clearTimeout(timeout);
      }
    })();

    const jobId = normalizeJobId(result.parsedJson);
    const status = normalizeStatus(result.parsedJson) ?? 'queued';

    logStage('normalized_response', {
      provider,
      responseStatus: result.status,
      responseContentType: result.contentType,
      rawResponseTextTruncated: truncateText(result.rawText),
      parsedResponseJson: result.parsedJson,
      normalizedJobId: jobId,
      normalizedStatus: status,
    });

    // Persist cloud_job_id / runpod_job_id immediately so that if the user
    // navigates away and returns, the reconcile route uses the correct ID.
    if (jobId && pieceId) {
      const repo = new WardrobeItemsRepository();
      repo.updateProcessingState(pieceId, jobId).catch((err) => {
        console.error('[3d-worker/submit] failed to persist runpod_job_id', { pieceId, jobId, error: err });
      });
    }

    return NextResponse.json(
      {
        ok: true,
        provider,
        status,
        jobId,
        runpod_job_id: jobId,
        upstream: result.parsedJson,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof StructuredStageError && error.stage === 'runpod_submit' && error.status === 404) {
      const runpod = getRunpodConfig();
      const diagnostics = await runpodRouteDiagnostics(runpod.baseUrl, runpod.token);
      return NextResponse.json(
        {
          ok: false,
          failedStage: 'runpod_route_mismatch',
          provider: 'runpod',
          message: 'RunPod worker route mismatch detected during submit.',
          hint: 'The configured RunPod worker does not expose POST /jobs. Check FastAPI routes or use the correct submit path.',
          retryable: true,
          diagnostics,
        },
        { status: 502 },
      );
    }

    const structured = toErrorPayload(error, {
      stage: 'submit_proxy',
      provider,
      status: 500,
    });

    logStage('caught_error', {
      provider,
      stage: structured.stage,
      status: structured.status,
      message: structured.message,
      details: structured.details,
      hint: structured.hint,
      code: structured.code,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      ok: false,
      failedStage: structured.stage,
      provider: structured.provider,
      message: structured.message,
      hint: structured.hint,
      retryable: structured.status ? structured.status >= 500 : true,
      diagnostics: structured.details,
      code: structured.code,
    }, {
      status: typeof structured.status === 'number' ? structured.status : 500,
    });
  }
}
