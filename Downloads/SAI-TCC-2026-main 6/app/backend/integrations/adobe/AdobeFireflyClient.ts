import { getValidAdobeAccessToken } from './AdobeFireflyAuth';

const DEFAULT_TIMEOUT_MS = 25_000;

type FireflyGenerationPayload = {
  prompt: string;
  negativePrompt?: string;
  numVariations: number;
  width: number;
  height: number;
  referenceImageUrl?: string;
};

type FireflyGenerationResult = {
  jobId: string | null;
  variations: Array<{
    variation_id: string;
    preview_url: string;
    output_url: string;
    thumbnail_url?: string | null;
    width?: number | null;
    height?: number | null;
    provider_job_id?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  raw: Record<string, unknown>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing configuration: ${name}`);
  }
  return value;
}

function normalizeFireflyResponse(payload: Record<string, unknown>): FireflyGenerationResult {
  const jobId = typeof payload.jobId === 'string' ? payload.jobId : typeof payload.id === 'string' ? payload.id : null;
  const outputs = Array.isArray(payload.outputs)
    ? payload.outputs
    : Array.isArray(payload.images)
      ? payload.images
      : Array.isArray(payload.data)
        ? payload.data
        : [];

  const variations = outputs
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const url =
        (typeof record.url === 'string' && record.url) ||
        (typeof record.imageUrl === 'string' && record.imageUrl) ||
        (typeof record.base64 === 'string' && record.base64 ? `data:image/png;base64,${record.base64}` : '');

      if (!url) return null;

      return {
        variation_id: `variation_${index + 1}`,
        preview_url: url,
        output_url: url,
        thumbnail_url: (typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : null) ?? null,
        width: typeof record.width === 'number' ? record.width : null,
        height: typeof record.height === 'number' ? record.height : null,
        provider_job_id: jobId,
        metadata: record,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return { jobId, variations, raw: payload };
}

export class AdobeFireflyClient {
  async generate(payload: FireflyGenerationPayload): Promise<FireflyGenerationResult> {
    const baseUrl = getRequiredEnv('ADOBE_FIREFLY_BASE_URL').replace(/\/$/, '');
    const orgId = getRequiredEnv('ADOBE_FIREFLY_ORG_ID');
    const clientId = getRequiredEnv('ADOBE_FIREFLY_CLIENT_ID');
    const timeoutMs = Number(process.env.ADOBE_FIREFLY_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    const accessToken = await getValidAdobeAccessToken();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v3/images/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-api-key': clientId,
          'x-gw-ims-org-id': orgId,
        },
        body: JSON.stringify({
          prompt: payload.prompt,
          negativePrompt: payload.negativePrompt,
          numVariations: payload.numVariations,
          size: {
            width: payload.width,
            height: payload.height,
          },
          contentClass: 'design',
          ...(payload.referenceImageUrl ? { style: { image: payload.referenceImageUrl } } : {}),
        }),
        signal: controller.signal,
      });

      const rawPayload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          (typeof rawPayload.error === 'string' && rawPayload.error) ||
          (typeof rawPayload.message === 'string' && rawPayload.message) ||
          `Adobe Firefly request failed with status ${response.status}`;
        throw new Error(message);
      }

      return normalizeFireflyResponse(rawPayload);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Adobe Firefly request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
