import { NextRequest, NextResponse } from 'next/server';

type WorkerConfig =
  | { type: 'runpod'; workerUrl: string; token: string }
  | { type: 'meshy'; baseUrl: string; token: string };

function resolveWorkerConfig(): WorkerConfig | null {
  // Prefer Meshy when API key is present (matches submit route priority)
  const meshyApiKey = process.env.MESHY_API_KEY?.trim() ?? '';
  if (meshyApiKey) {
    const baseUrl = (process.env.MESHY_BASE_URL?.trim() || 'https://api.meshy.ai/openapi/v1').replace(/\/+$/, '');
    return { type: 'meshy', baseUrl, token: meshyApiKey };
  }

  const workerUrl = process.env.GPU_WORKER_URL?.trim() ?? '';
  const token = process.env.GPU_WORKER_TOKEN?.trim() ?? '';
  if (workerUrl && token) {
    return { type: 'runpod', workerUrl: workerUrl.replace(/\/+$/, ''), token };
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const config = resolveWorkerConfig();

  if (!config) {
    return NextResponse.json(
      { error: 'Worker not configured' },
      { status: 500 }
    );
  }

  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId' },
      { status: 400 }
    );
  }

  const statusUrl = config.type === 'meshy'
    ? `${config.baseUrl}/image-to-3d/${jobId}`
    : `${config.workerUrl}/jobs/${jobId}`;

  const abort = new AbortController();
  const abortTimer = setTimeout(() => abort.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: 'no-store',
      signal: abort.signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json(
      { error: 'upstream_timeout', message },
      { status: 503 }
    );
  } finally {
    clearTimeout(abortTimer);
  }

  const contentType = response.headers.get('content-type') ?? 'application/json';
  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': contentType },
  });
}
