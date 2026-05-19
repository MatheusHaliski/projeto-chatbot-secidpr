export type WorkerProvider = 'runpod' | 'meshy' | 'fallback';

export interface SafeFetchResult {
  status: number;
  contentType: string;
  rawText: string;
  parsedJson: unknown | null;
}

export interface StructuredStageErrorInput {
  stage: string;
  provider: WorkerProvider;
  message: string;
  status?: number;
  details?: unknown;
  hint?: string;
  code?: string;
}

export class StructuredStageError extends Error {
  readonly stage: string;
  readonly provider: WorkerProvider;
  readonly status?: number;
  readonly details?: unknown;
  readonly hint?: string;
  readonly code?: string;

  constructor(input: StructuredStageErrorInput) {
    super(input.message);
    this.name = 'StructuredStageError';
    this.stage = input.stage;
    this.provider = input.provider;
    this.status = input.status;
    this.details = input.details;
    this.hint = input.hint;
    this.code = input.code;
  }
}

export function truncateText(value: string, maxLength = 1000): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...<truncated:${value.length - maxLength}>`;
}

export function deriveFailureHint(status?: number, code?: string, provider?: WorkerProvider): string | undefined {
  if (code === 'TIMEOUT') {
    return 'Request timeout: worker cold start or long 3D generation job.';
  }
  if (code === 'INVALID_JSON') {
    return 'Remote service returned invalid JSON (often HTML error page).';
  }
  if (!status) return undefined;
  if (status === 401 || status === 403) {
    return provider === 'meshy'
      ? 'Invalid or missing MESHY_API_KEY.'
      : 'Missing or invalid token. Check Authorization Bearer credentials.';
  }
  if (status === 404) {
    return provider === 'meshy'
      ? 'Meshy endpoint not found. Check MESHY_BASE_URL (expected: https://api.meshy.ai/openapi/v1).'
      : 'Wrong endpoint path. Verify RunPod path (/jobs vs /run).';
  }
  if (status === 405) return 'Wrong HTTP method used by remote service.';
  if (status === 502 || status === 503) {
    return provider === 'meshy'
      ? 'Meshy service unavailable.'
      : 'RunPod pod not ready or Uvicorn app is not running.';
  }
  return undefined;
}

export function logStage(event: string, data: Record<string, unknown>): void {
  console.info('[3d-worker]', event, data);
}

export async function safeFetchJson(
  url: string,
  options: RequestInit,
  stage: string,
  provider: WorkerProvider,
): Promise<SafeFetchResult> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
    const causeCode = cause instanceof Error ? (cause as Error & { code?: string }).code : undefined;
    const causeMessage = cause instanceof Error ? cause.message : undefined;
    const errorCode = isTimeout ? 'TIMEOUT' : (causeCode ?? undefined);
    const hint = isTimeout
      ? 'Request timeout: worker cold start or long 3D generation job.'
      : causeCode === 'ENOTFOUND'
        ? `DNS resolution failed for "${new URL(url).hostname}". Check network connectivity or MESHY_BASE_URL.`
        : causeCode === 'ECONNREFUSED'
          ? `Connection refused by "${new URL(url).hostname}". The host may be down or blocked.`
          : causeCode
            ? `Network error (${causeCode}) reaching "${new URL(url).hostname}". Check internet connectivity.`
            : undefined;
    throw new StructuredStageError({
      stage,
      provider,
      message,
      code: errorCode,
      hint,
      details: { fetchError: message, causeCode, causeMessage },
    });
  }

  const status = response.status;
  const contentType = response.headers.get('content-type') ?? 'unknown';
  const rawText = await response.text();
  const rawTextTruncated = truncateText(rawText);

  let parsedJson: unknown | null = null;
  if (rawText.length > 0) {
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = null;
    }
  }

  logStage('safe_fetch_result', {
    stage,
    provider,
    status,
    contentType,
    rawTextTruncated,
    parsedJson,
  });

  if (!response.ok) {
    throw new StructuredStageError({
      stage,
      provider,
      message: `Remote request failed with status ${status}`,
      status,
      details: {
        contentType,
        rawTextTruncated,
        parsedJson,
      },
      hint: deriveFailureHint(status, undefined, provider),
    });
  }

  return {
    status,
    contentType,
    rawText,
    parsedJson,
  };
}

export function toErrorPayload(
  error: unknown,
  fallback: { stage: string; provider: WorkerProvider; status?: number },
) {
  if (error instanceof StructuredStageError) {
    return {
      ok: false,
      stage: error.stage,
      provider: error.provider,
      message: error.message,
      status: error.status ?? fallback.status ?? 500,
      details: error.details,
      hint: error.hint ?? deriveFailureHint(error.status, error.code, error.provider),
      code: error.code,
    };
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;
  return {
    ok: false,
    stage: fallback.stage,
    provider: fallback.provider,
    message,
    status: fallback.status ?? 500,
    details: {
      stack,
    },
    hint: 'Unexpected internal error in Next.js proxy route.',
  };
}
