import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';
import { ClothingAnalysisService } from './ClothingAnalysisService';
import { ImageNormalizationService } from './ImageNormalizationService';
import { ImageSegmentationService } from './ImageSegmentationService';
import { ServiceError } from './errors';

interface Process2DInput {
  wardrobe_item_id: string;
  raw_upload_image_url: string;
  piece_type: string;
}

export class Clothing2DGenerationService {
  constructor(
    private readonly wardrobeRepository = new WardrobeItemsRepository(),
    private readonly analysisService = new ClothingAnalysisService(),
    private readonly segmentationService = new ImageSegmentationService(),
    private readonly normalizationService = new ImageNormalizationService(),
  ) {}

  async process(input: Process2DInput) {
    if (!input.wardrobe_item_id || !input.raw_upload_image_url) {
      throw new ServiceError('wardrobe_item_id and raw_upload_image_url are required.', 400);
    }

    const analysis = await this.analysisService.analyze(input.raw_upload_image_url);
    const segmentation = await this.segmentationService.segment({
      imageUrl: input.raw_upload_image_url,
      pieceType: input.piece_type,
    });

    const normalized = await this.normalizationService.normalize({
      segmentedPngUrl: segmentation.segmentedPngUrl,
      targetWidth: 1200,
      targetHeight: 1600,
      paddingRatio: 0.08,
    });

    const shouldRefine = Math.abs(analysis.rotation_z_degrees) > 8 || !analysis.fully_visible || analysis.catalog_readiness_score < 70;
    const refinedImage = shouldRefine ? await this.refineWithDiffusion(normalized.normalizedPngUrl, input.piece_type) : null;

    const approvedCatalog2DUrl = analysis.catalog_readiness_score >= 76 ? (refinedImage ?? normalized.normalizedPngUrl) : null;
    const recommendedAction = analysis.catalog_readiness_score < 45 ? 'request_reupload' : approvedCatalog2DUrl ? 'approve_catalog_2d' : 'normalize_only';

    await this.wardrobeRepository.update2DAssets(input.wardrobe_item_id, {
      image_assets: {
        raw_upload_image_url: input.raw_upload_image_url,
        segmented_png_url: segmentation.segmentedPngUrl,
        normalized_2d_preview_url: normalized.normalizedPngUrl,
        approved_catalog_2d_url: approvedCatalog2DUrl,
      },
      image_analysis: {
        contains_human: analysis.contains_human,
        rotation_z_degrees: analysis.rotation_z_degrees,
        fully_visible: analysis.fully_visible,
        centered_score: analysis.centered_score,
        front_view_score: analysis.front_view_score,
        background_clean_score: analysis.background_clean_score,
        catalog_readiness_score: analysis.catalog_readiness_score,
        recommended_action: recommendedAction,
      },
      stage_details: {
        segmentation: segmentation.stageDetails,
        normalization: normalized,
        refinement: shouldRefine ? { attempted: true, output: refinedImage } : { attempted: false },
      },
    });

    return {
      wardrobe_item_id: input.wardrobe_item_id,
      image_assets: {
        raw_upload_image_url: input.raw_upload_image_url,
        segmented_png_url: segmentation.segmentedPngUrl,
        normalized_2d_preview_url: normalized.normalizedPngUrl,
        approved_catalog_2d_url: approvedCatalog2DUrl,
      },
      image_analysis: {
        ...analysis,
        recommended_action: recommendedAction,
      },
    };
  }

  private async refineWithDiffusion(imageUrl: string, pieceType: string): Promise<string | null> {
    const token = process.env.REPLICATE_API_TOKEN;
    const version = process.env.REPLICATE_CLOTHING_REFINER_VERSION;
    if (!token || !version) return null;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version,
        input: {
          image: imageUrl,
          prompt: `Generate clean catalog-style ${pieceType} product image on transparent background, front-facing, centered.`,
        },
      }),
    });

    if (!response.ok) return null;
    const prediction = (await response.json()) as { urls?: { get?: string } };
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) return null;

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const pollResponse = await fetch(pollUrl, { headers: { Authorization: `Token ${token}` } });
      if (!pollResponse.ok) return null;
      const payload = (await pollResponse.json()) as { status?: string; output?: string | string[] };
      if (payload.status === 'succeeded') {
        if (typeof payload.output === 'string') return payload.output;
        if (Array.isArray(payload.output)) return String(payload.output[0] ?? '');
      }
      if (payload.status === 'failed' || payload.status === 'canceled') return null;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return null;
  }
}
