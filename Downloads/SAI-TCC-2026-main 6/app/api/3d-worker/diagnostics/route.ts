import { NextResponse } from 'next/server';
import { logStage, safeFetchJson, WorkerProvider } from '@/app/api/3d-worker/utils';

function normalizeUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

async function probeUrl(url: string, provider: WorkerProvider, stage: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const result = await safeFetchJson(
      url,
      {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      },
      stage,
      provider,
    );

    return {
      ok: true,
      status: result.status,
      contentType: result.contentType,
      parsedJson: result.parsedJson,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const gpuWorkerUrl = normalizeUrl(process.env.GPU_WORKER_URL);
  const runpodEndpointUrl = normalizeUrl(process.env.RUNPOD_ENDPOINT_URL);
  const expectedSubmitPath = gpuWorkerUrl ? '/jobs' : '/run';

  const diagnostics = {
    ok: true,
    stage: 'diagnostics',
    env: {
      hasGpuWorkerUrl: Boolean(gpuWorkerUrl),
      hasGpuWorkerToken: Boolean(process.env.GPU_WORKER_TOKEN?.trim()),
      hasRunpodEndpointUrl: Boolean(runpodEndpointUrl),
      hasRunpodApiKey: Boolean(process.env.RUNPOD_API_KEY?.trim()),
      hasMeshyApiKey: Boolean(process.env.MESHY_API_KEY?.trim()),
      hasMeshyBaseUrl: Boolean(normalizeUrl(process.env.MESHY_BASE_URL)),
      expectedSubmitPath,
    },
    runpod: {
      ping: null as unknown,
      openapi: null as unknown,
    },
  };

  if (gpuWorkerUrl) {
    diagnostics.runpod.ping = await probeUrl(`${gpuWorkerUrl}/ping`, 'runpod', 'runpod_ping');
    diagnostics.runpod.openapi = await probeUrl(`${gpuWorkerUrl}/openapi.json`, 'runpod', 'runpod_openapi');
  } else if (runpodEndpointUrl) {
    diagnostics.runpod.ping = {
      ok: false,
      message: 'RUNPOD_ENDPOINT_URL is serverless; /ping is typically unavailable.',
    };
    diagnostics.runpod.openapi = {
      ok: false,
      message: 'RUNPOD_ENDPOINT_URL is serverless; /openapi.json is typically unavailable.',
    };
  }

  logStage('diagnostics_summary', diagnostics as Record<string, unknown>);
  return NextResponse.json(diagnostics, { status: 200 });
}
