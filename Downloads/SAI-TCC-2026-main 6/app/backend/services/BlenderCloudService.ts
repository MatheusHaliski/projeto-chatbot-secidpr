import {
  buildHealthUrl,
  buildStatusUrl,
  buildSubmitUrl,
  isBlenderCloudConfigured,
  resolveBlenderCloudConfig,
  type BlenderCloudConfig,
} from './blenderCloudConfig';

interface PodSubmitResponse {
  id?: string;
  job_id?: string;
  jobId?: string;
  status?: string;
  output?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  error?: unknown;
}

interface PodStatusResponse {
  id?: string;
  job_id?: string;
  jobId?: string;
  status?: string;
  artifacts?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  logs?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: unknown;
}

export interface SubmitBlenderCloudJobInput {
  modelUrl?: string;
  imageUrl?: string;
  jobType: string;
  options?: Record<string, unknown>;
}

export interface BlenderCloudJobStatus {
  cloudJobId: string;
  status: 'queued' | 'submitted' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  artifacts: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  logs: Record<string, unknown> | null;
  raw: Record<string, unknown>;
  errorMessage: string | null;
}

interface BlenderCloudSubmitResult {
  cloudJobId: string;
  status: BlenderCloudJobStatus['status'];
  artifacts: Record<string, unknown> | null;
  raw: Record<string, unknown>;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function getJobId(source: Record<string, unknown>): string {
  const candidate = source.job_id ?? source.jobId ?? source.id;
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function normalizeStatus(statusLike: unknown): BlenderCloudJobStatus['status'] | null {
  const normalized = String(statusLike ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!normalized) return null;
  if (['completed', 'succeeded', 'done', 'success', 'finished', 'complete'].includes(normalized)) return 'completed';
  if (['failed', 'error', 'errored', 'timed_out', 'timeout'].includes(normalized)) return 'failed';
  if (['cancelled', 'canceled', 'terminated', 'aborted'].includes(normalized)) return 'cancelled';
  if (['running', 'in_progress', 'processing', 'started', 'active'].includes(normalized)) return 'in_progress';
  if (['submitted', 'accepted'].includes(normalized)) return 'submitted';
  if (['queued', 'pending', 'waiting'].includes(normalized)) return 'queued';
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function findArtifactUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
  }
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  for (const key of ['url', 'href', 'download_url', 'downloadUrl', 'model_url', 'modelUrl', 'glb_url', 'glbUrl']) {
    const candidate = readString(record[key]);
    if (candidate) return candidate;
  }
  return null;
}

function extractArtifacts(payload: Record<string, unknown>): Record<string, unknown> | null {
  const output = toRecord(payload.output);
  const outputArtifacts = toRecord(output.artifacts);
  const topLevelArtifacts = toRecord(payload.artifacts);

  if (Object.keys(topLevelArtifacts).length > 0) return topLevelArtifacts;
  if (Object.keys(outputArtifacts).length > 0) return outputArtifacts;

  const directUrlKeys = [
    'model_3d_url',
    'modelUrl',
    'outputModelUrl',
    'outputUrl',
    'glb',
    'glbUrl',
    'glb_url',
    'model_url',
    'output_url',
    'download_url',
    'file_url',
    'result_url',
    'artifact_url',
    'artifactUrl',
    'url',
  ];

  const fromOutput = directUrlKeys.reduce<Record<string, unknown>>((acc, key) => {
    const candidate = output[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      acc[key] = candidate.trim();
    }
    return acc;
  }, {});

  const fromTop = directUrlKeys.reduce<Record<string, unknown>>((acc, key) => {
    const candidate = payload[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      acc[key] = candidate.trim();
    }
    return acc;
  }, {});

  const nestedOutputCandidates: Record<string, unknown> = {};
  const modelCandidate = findArtifactUrl(output.model);
  const fileCandidate = findArtifactUrl(output.file);
  const resultCandidate = findArtifactUrl(output.result);
  if (modelCandidate) nestedOutputCandidates.model = modelCandidate;
  if (fileCandidate) nestedOutputCandidates.file = fileCandidate;
  if (resultCandidate) nestedOutputCandidates.result = resultCandidate;

  const combined = { ...fromTop, ...fromOutput, ...nestedOutputCandidates };
  return Object.keys(combined).length > 0 ? combined : null;
}

function isErrorLikeText(value: string): boolean {
  return /(error|failed|failure|traceback|exception|timed?\s*out|invalid|not found|unable)/i.test(value);
}

function extractErrorMessage(payload: Record<string, unknown>): string | null {
  const output = toRecord(payload.output);
  const topLevelError = toRecord(payload.error);
  const outputError = toRecord(output.error);
  const mergedError = { ...outputError, ...topLevelError };
  const errorCode = readString(mergedError.code);
  if (errorCode === 'invalid_input_low_quality') {
    const qualityReport = toRecord(mergedError.qualityReport ?? payload.qualityReport ?? output.qualityReport);
    const brightness = Number(qualityReport.brightness ?? NaN);
    const contrast = Number(qualityReport.contrast ?? NaN);
    const qualityScore = Number(qualityReport.qualityScore ?? payload.qualityScore ?? NaN);
    const threshold = Number(mergedError.qualityThreshold ?? payload.cleanedQualityThreshold ?? NaN);
    const bits = [
      'Cleaned garment image did not meet quality threshold.',
      Number.isFinite(threshold) ? `threshold=${threshold.toFixed(2)}` : null,
      Number.isFinite(brightness) ? `brightness=${brightness.toFixed(3)}` : null,
      Number.isFinite(contrast) ? `contrast=${contrast.toFixed(3)}` : null,
      Number.isFinite(qualityScore) ? `qualityScore=${qualityScore.toFixed(3)}` : null,
    ].filter((value): value is string => Boolean(value));
    return bits.join(' ');
  }

  const candidates: unknown[] = [
    payload.error,
    output.error,
    payload.traceback,
    output.traceback,
    payload.message,
    output.message,
    payload.detail,
    output.detail,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const message = candidate.trim();
      if (candidate === payload.message || candidate === output.message || candidate === payload.detail || candidate === output.detail) {
        if (!isErrorLikeText(message)) continue;
      }
      return message;
    }
    if (candidate && typeof candidate === 'object') {
      return clipForLog(candidate, 800);
    }
  }
  return null;
}

function resolveRawStatus(payload: Record<string, unknown>): { rawStatus: unknown; candidates: Array<{ field: string; value: unknown }> } {
  const output = toRecord(payload.output);
  const candidates: Array<{ field: string; value: unknown }> = [
    { field: 'body.status', value: payload.status },
    { field: 'output.status', value: output.status },
    { field: 'body.state', value: payload.state },
    { field: 'output.state', value: output.state },
    { field: 'body.phase', value: payload.phase },
    { field: 'output.phase', value: output.phase },
    { field: 'body.result', value: payload.result },
    { field: 'output.result', value: output.result },
    { field: 'body.job_status', value: payload.job_status },
    { field: 'output.job_status', value: output.job_status },
  ].filter((candidate) => candidate.value !== undefined && candidate.value !== null);

  const preferred = candidates.find((candidate) => {
    if (typeof candidate.value === 'string') return candidate.value.trim().length > 0;
    return typeof candidate.value === 'number' || typeof candidate.value === 'boolean';
  });

  return {
    rawStatus: preferred?.value ?? null,
    candidates,
  };
}

function clipForLog(value: unknown, max = 500): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value ?? {});
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

export class BlenderCloudService {
  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(config: BlenderCloudConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
    };
  }

  private mapSubmitPayload(config: BlenderCloudConfig, input: SubmitBlenderCloudJobInput): Record<string, unknown> {
    const internalPayload = {
      modelUrl: input.modelUrl,
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      jobType: input.jobType,
      options: input.options ?? {},
    };

    return config.payloadMode === 'input' ? { input: internalPayload } : internalPayload;
  }

  isConfigured(): boolean {
    return isBlenderCloudConfigured();
  }

  async getDiagnostics() {
    const config = resolveBlenderCloudConfig();
    const submitUrl = buildSubmitUrl(config);
    const healthUrl = buildHealthUrl(config);

    let health: { ok: boolean; status: number | null; bodyExcerpt: string | null; error: string | null } = {
      ok: false,
      status: null,
      bodyExcerpt: null,
      error: null,
    };

    try {
      const response = await this.fetchWithTimeout(healthUrl, {
        method: 'GET',
        headers: config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {},
      }, config.healthTimeoutMs);

      const text = await response.text().catch(() => '');
      health = {
        ok: response.ok,
        status: response.status,
        bodyExcerpt: clipForLog(text || null),
        error: null,
      };
    } catch (error) {
      health = {
        ok: false,
        status: null,
        bodyExcerpt: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      apiUrl: config.apiUrl,
      submitUrl,
      statusPathTemplate: config.statusPathTemplate,
      healthUrl,
      payloadMode: config.payloadMode,
      authSource: config.authSource,
      health,
    };
  }

  async submitBlenderCloudJob(input: SubmitBlenderCloudJobInput): Promise<BlenderCloudSubmitResult> {
    const config = resolveBlenderCloudConfig();
    const submitUrl = buildSubmitUrl(config);
    const requestBody = this.mapSubmitPayload(config, input);

    console.info('[blender-cloud] submit request', {
      submitUrl,
      payloadMode: config.payloadMode,
      authSource: config.authSource,
      jobType: input.jobType,
    });

    let response: Response;
    try {
      response = await this.fetchWithTimeout(submitUrl, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
      }, config.submitTimeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Blender Cloud submit request failed. url=${submitUrl} timeoutMs=${config.submitTimeoutMs} error=${message}`);
    }

    const body = toRecord((await response.json().catch(() => ({}))) as PodSubmitResponse);

    console.info('[blender-cloud] submit response', {
      submitUrl,
      responseStatus: response.status,
      bodyExcerpt: clipForLog(body),
    });

    if (!response.ok) {
      throw new Error(`Blender Cloud submit failed. url=${submitUrl} status=${response.status} body=${clipForLog(body)}`);
    }

    const cloudJobId = getJobId(body);
    const normalizedStatus = normalizeStatus(body.status) ?? (extractArtifacts(body) ? 'completed' : 'submitted');
    const artifacts = extractArtifacts(body);

    if (cloudJobId) {
      return {
        cloudJobId,
        status: normalizedStatus,
        artifacts,
        raw: body,
      };
    }

    if (artifacts) {
      return {
        cloudJobId: 'inline-response',
        status: 'completed',
        artifacts,
        raw: body,
      };
    }

    throw new Error(`Blender Cloud submit returned no job id and no artifacts. url=${submitUrl} body=${clipForLog(body)}`);
  }

  async getBlenderCloudJobStatus(cloudJobId: string, inlineRaw?: Record<string, unknown>): Promise<BlenderCloudJobStatus> {
    if (cloudJobId === 'inline-response') {
      const artifacts = inlineRaw ? extractArtifacts(inlineRaw) : null;
      return {
        cloudJobId,
        status: 'completed',
        artifacts,
        metrics: null,
        logs: null,
        raw: inlineRaw ?? { status: 'completed' },
        errorMessage: null,
      };
    }

    const config = resolveBlenderCloudConfig();
    const statusUrl = buildStatusUrl(config, cloudJobId);

    console.info('[blender-cloud] status request', {
      cloudJobId,
      statusUrl,
      authSource: config.authSource,
    });

    let response: Response;
    try {
      response = await this.fetchWithTimeout(statusUrl, {
        method: 'GET',
        headers: config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {},
      }, config.statusTimeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Blender Cloud status request failed. url=${statusUrl} timeoutMs=${config.statusTimeoutMs} error=${message}`);
    }

    const rawText = await response.text().catch(() => '');
    const rawResponseExcerpt = clipForLog(rawText || null, 800);

    console.info('[blender-cloud] raw status response text', {
      cloudJobId,
      statusUrl,
      responseStatus: response.status,
      rawTextExcerpt: rawResponseExcerpt,
    });

    if (!response.ok) {
      throw new Error(`Blender Cloud status failed. cloudJobId=${cloudJobId} url=${statusUrl} status=${response.status} body=${rawResponseExcerpt}`);
    }

    if (!rawText.trim()) {
      console.warn('[blender-cloud] empty status response body', {
        cloudJobId,
        statusUrl,
        responseStatus: response.status,
      });
      return {
        cloudJobId,
        status: 'failed',
        artifacts: null,
        metrics: null,
        logs: null,
        raw: { responseStatus: response.status, rawText: '' },
        errorMessage: 'Status response body was empty',
      };
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawText) as PodStatusResponse;
    } catch (error) {
      console.warn('[blender-cloud] NON-JSON RESPONSE from status endpoint', {
        cloudJobId,
        statusUrl,
        responseStatus: response.status,
        parseError: error instanceof Error ? error.message : String(error),
        rawTextExcerpt: rawResponseExcerpt,
      });
      return {
        cloudJobId,
        status: 'failed',
        artifacts: null,
        metrics: null,
        logs: null,
        raw: { responseStatus: response.status, rawText },
        errorMessage: 'Status endpoint returned non-JSON response',
      };
    }

    const body = toRecord(parsedBody);
    const output = toRecord(body.output);
    const artifacts = extractArtifacts(body);
    const errorMessage = extractErrorMessage(body);
    const { rawStatus, candidates } = resolveRawStatus(body);
    const normalizedFromStatus = normalizeStatus(rawStatus);

    let finalStatus: BlenderCloudJobStatus['status'];
    if (errorMessage) {
      finalStatus = 'failed';
    } else if (artifacts) {
      finalStatus = 'completed';
    } else if (normalizedFromStatus) {
      finalStatus = normalizedFromStatus;
    } else {
      finalStatus = 'in_progress';
      console.warn('[blender-cloud] status missing from payload and no terminal signal found', {
        cloudJobId,
        statusUrl,
        responseStatus: response.status,
        parsedPayloadExcerpt: clipForLog(body, 1200),
      });
    }

    console.info('[blender-cloud] status poll diagnostics', {
      cloudJobId,
      statusUrl,
      responseStatus: response.status,
      rawResponseExcerpt: rawResponseExcerpt,
      statusCandidates: candidates.map((candidate) => ({ field: candidate.field, valueExcerpt: clipForLog(candidate.value, 160) })),
      rawStatus: rawStatus ?? null,
      normalizedStatus: finalStatus,
      artifactsFound: Boolean(artifacts),
      errorMessageFound: Boolean(errorMessage),
    });

    return {
      cloudJobId,
      status: finalStatus,
      artifacts,
      metrics: Object.keys(toRecord(body.metrics)).length ? toRecord(body.metrics) : Object.keys(toRecord(output.metrics)).length ? toRecord(output.metrics) : null,
      logs: Object.keys(toRecord(body.logs)).length ? toRecord(body.logs) : Object.keys(toRecord(output.logs)).length ? toRecord(output.logs) : null,
      raw: body,
      errorMessage,
    };
  }
}
