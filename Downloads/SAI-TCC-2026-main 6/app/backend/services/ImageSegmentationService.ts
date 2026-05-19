import { ServiceError } from './errors';

export interface SegmentationRequest {
  imageUrl: string;
  pieceType: string;
}

export interface SegmentationResult {
  segmentedPngUrl: string;
  maskUrl?: string | null;
  provider: 'u2net' | 'sam' | 'replicate';
  confidence: number;
  stageDetails: Record<string, unknown>;
}

/**
 * Real segmentation orchestration.
 * Supported providers:
 * - replicate: any hosted U-2-Net/SAM style endpoint
 * - sam/u2net: internal HTTP microservice
 */
export class ImageSegmentationService {
  async segment(input: SegmentationRequest): Promise<SegmentationResult> {
    const provider = (process.env.CLOTHING_SEGMENTATION_PROVIDER ?? 'replicate').toLowerCase();

    if (provider === 'replicate') return this.segmentWithReplicate(input);
    if (provider === 'sam' || provider === 'u2net') return this.segmentWithCustomApi(input, provider as 'sam' | 'u2net');

    throw new ServiceError(`Unsupported segmentation provider: ${provider}`, 500);
  }

  private async segmentWithReplicate(input: SegmentationRequest): Promise<SegmentationResult> {
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const version = process.env.REPLICATE_SEGMENTATION_VERSION;

    if (!replicateToken || !version) {
      throw new ServiceError('Missing Replicate segmentation configuration (REPLICATE_API_TOKEN, REPLICATE_SEGMENTATION_VERSION).', 500);
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version,
        input: {
          image: input.imageUrl,
          garment_type: input.pieceType,
          return_mask: true,
        },
      }),
    });

    if (!response.ok) {
      throw new ServiceError('Replicate segmentation request failed.', 502);
    }

    const prediction = (await response.json()) as {
      id?: string;
      output?: string | string[] | { image?: string; mask?: string; confidence?: number };
      urls?: { get?: string };
      status?: string;
    };

    const pollUrl = prediction.urls?.get;
    if (!pollUrl) throw new ServiceError('Replicate did not return a polling URL.', 502);

    const completed = await this.pollReplicatePrediction(pollUrl, replicateToken);
    const output = completed.output;

    let segmentedPngUrl = '';
    let maskUrl: string | null = null;
    let confidence = 0.85;

    if (typeof output === 'string') segmentedPngUrl = output;
    if (Array.isArray(output)) segmentedPngUrl = String(output[0] ?? '');
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      const outputPayload = output as { image?: string; mask?: string; confidence?: number };
      segmentedPngUrl = String(outputPayload.image ?? '');
      maskUrl = outputPayload.mask ? String(outputPayload.mask) : null;
      confidence = Number(outputPayload.confidence ?? confidence);
    }

    if (!segmentedPngUrl) throw new ServiceError('Segmentation provider returned no image output.', 502);

    return {
      segmentedPngUrl,
      maskUrl,
      provider: 'replicate',
      confidence,
      stageDetails: {
        pipeline: 'segmentation',
        provider: 'replicate',
        prediction_id: completed.id,
      },
    };
  }

  private async segmentWithCustomApi(input: SegmentationRequest, provider: 'sam' | 'u2net'): Promise<SegmentationResult> {
    const endpoint = process.env.CLOTHING_SEGMENTATION_ENDPOINT;
    if (!endpoint) {
      throw new ServiceError('Missing CLOTHING_SEGMENTATION_ENDPOINT for custom segmentation provider.', 500);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: input.imageUrl, piece_type: input.pieceType, provider }),
    });

    if (!response.ok) throw new ServiceError('Custom segmentation service failed.', 502);

    const data = (await response.json()) as { segmented_png_url?: string; mask_url?: string | null; confidence?: number };
    if (!data.segmented_png_url) throw new ServiceError('Custom segmentation service did not return segmented_png_url.', 502);

    return {
      segmentedPngUrl: data.segmented_png_url,
      maskUrl: data.mask_url ?? null,
      provider,
      confidence: Number(data.confidence ?? 0.8),
      stageDetails: {
        pipeline: 'segmentation',
        provider,
        endpoint,
      },
    };
  }

  private async pollReplicatePrediction(url: string, token: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(url, { headers: { Authorization: `Token ${token}` } });
      if (!response.ok) throw new ServiceError('Failed polling Replicate segmentation prediction.', 502);
      const payload = (await response.json()) as { status?: string; id?: string; output?: unknown; error?: string };

      if (payload.status === 'succeeded') return payload;
      if (payload.status === 'failed' || payload.status === 'canceled') {
        throw new ServiceError(`Replicate segmentation failed: ${payload.error ?? 'unknown error'}`, 502);
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    throw new ServiceError('Segmentation polling timed out.', 504);
  }
}
