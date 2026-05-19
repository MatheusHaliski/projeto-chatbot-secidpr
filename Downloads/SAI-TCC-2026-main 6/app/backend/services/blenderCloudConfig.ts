export type BlenderCloudAuthSource =
  | 'BLENDER_CLOUD_API_TOKEN'
  | 'GPU_WORKER_TOKEN'
  | 'BLENDER_WORKER_TOKEN'
  | 'RUNPOD_API_KEY'
  | 'none';
export type BlenderCloudPayloadMode = 'raw' | 'input';

export interface BlenderCloudConfig {
  apiUrl: string;
  submitPath: string;
  statusPathTemplate: string;
  healthPath: string;
  payloadMode: BlenderCloudPayloadMode;
  authToken: string;
  authSource: BlenderCloudAuthSource;
  submitTimeoutMs: number;
  statusTimeoutMs: number;
  healthTimeoutMs: number;
}

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '');
}

function normalizePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function resolveApiUrl(): string {
  const explicit = process.env.BLENDER_CLOUD_API_URL?.trim();
  if (explicit) return normalizeBaseUrl(explicit);

  const legacy = process.env.RUNPOD_ENDPOINT_URL?.trim();
  if (legacy) return normalizeBaseUrl(legacy);

  throw new Error('Missing Blender Cloud API URL. Set BLENDER_CLOUD_API_URL (or legacy RUNPOD_ENDPOINT_URL).');
}

function resolveAuth(): Pick<BlenderCloudConfig, 'authToken' | 'authSource'> {
  const explicitToken = process.env.BLENDER_CLOUD_API_TOKEN?.trim();
  if (explicitToken) {
    return {
      authToken: explicitToken,
      authSource: 'BLENDER_CLOUD_API_TOKEN',
    };
  }

  const gpuWorkerToken = process.env.GPU_WORKER_TOKEN?.trim();
  if (gpuWorkerToken) {
    return {
      authToken: gpuWorkerToken,
      authSource: 'GPU_WORKER_TOKEN',
    };
  }

  const blenderWorkerToken = process.env.BLENDER_WORKER_TOKEN?.trim();
  if (blenderWorkerToken) {
    return {
      authToken: blenderWorkerToken,
      authSource: 'BLENDER_WORKER_TOKEN',
    };
  }

  const runpodApiKey = process.env.RUNPOD_API_KEY?.trim();
  if (runpodApiKey) {
    return {
      authToken: runpodApiKey,
      authSource: 'RUNPOD_API_KEY',
    };
  }

  return {
    authToken: '',
    authSource: 'none',
  };
}

function resolvePayloadMode(): BlenderCloudPayloadMode {
  const rawMode = (process.env.BLENDER_CLOUD_SUBMIT_PAYLOAD_MODE ?? 'raw').trim().toLowerCase();
  return rawMode === 'input' ? 'input' : 'raw';
}

function resolveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function validateConfig(config: BlenderCloudConfig): void {
  try {
    new URL(config.apiUrl);
  } catch {
    throw new Error(`Invalid BLENDER_CLOUD_API_URL value: "${config.apiUrl}"`);
  }

  if (!config.statusPathTemplate.includes(':jobId')) {
    throw new Error('BLENDER_CLOUD_STATUS_PATH_TEMPLATE must include ":jobId".');
  }
}

export function resolveBlenderCloudConfig(): BlenderCloudConfig {
  const auth = resolveAuth();
  const config: BlenderCloudConfig = {
    apiUrl: resolveApiUrl(),
    submitPath: normalizePath(process.env.BLENDER_CLOUD_SUBMIT_PATH?.trim() || '/jobs'),
    statusPathTemplate: normalizePath(process.env.BLENDER_CLOUD_STATUS_PATH_TEMPLATE?.trim() || '/jobs/:jobId'),
    healthPath: normalizePath(process.env.BLENDER_CLOUD_HEALTH_PATH?.trim() || '/ping'),
    payloadMode: resolvePayloadMode(),
    authToken: auth.authToken,
    authSource: auth.authSource,
    submitTimeoutMs: resolveNumber(process.env.BLENDER_CLOUD_SUBMIT_TIMEOUT_MS, 15000),
    statusTimeoutMs: resolveNumber(process.env.BLENDER_CLOUD_STATUS_TIMEOUT_MS, 10000),
    healthTimeoutMs: resolveNumber(process.env.BLENDER_CLOUD_HEALTH_TIMEOUT_MS, 5000),
  };

  validateConfig(config);
  return config;
}

export function isBlenderCloudConfigured(): boolean {
  return Boolean(process.env.BLENDER_CLOUD_API_URL?.trim() || process.env.RUNPOD_ENDPOINT_URL?.trim());
}

export function buildBlenderCloudUrl(apiUrl: string, path: string): string {
  return `${normalizeBaseUrl(apiUrl)}${normalizePath(path)}`;
}

export function buildSubmitUrl(config: BlenderCloudConfig): string {
  return buildBlenderCloudUrl(config.apiUrl, config.submitPath);
}

export function buildStatusUrl(config: BlenderCloudConfig, cloudJobId: string): string {
  const statusPath = config.statusPathTemplate.replace(':jobId', encodeURIComponent(cloudJobId));
  return buildBlenderCloudUrl(config.apiUrl, statusPath);
}

export function buildHealthUrl(config: BlenderCloudConfig): string {
  return buildBlenderCloudUrl(config.apiUrl, config.healthPath);
}
