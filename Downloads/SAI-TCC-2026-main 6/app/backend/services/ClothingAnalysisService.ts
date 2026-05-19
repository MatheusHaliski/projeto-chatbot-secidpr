import { ServiceError } from './errors';

export interface ClothingImageAnalysis {
  contains_human: boolean;
  bounding_box: { x: number; y: number; width: number; height: number };
  rotation_z_degrees: number;
  fully_visible: boolean;
  centered_score: number;
  front_view_score: number;
  background_clean_score: number;
  catalog_readiness_score: number;
  recommended_action: 'approve_catalog_2d' | 'refine_with_diffusion' | 'normalize_only' | 'request_reupload';
}

export class ClothingAnalysisService {
  async analyze(imageUrl: string): Promise<ClothingImageAnalysis> {
    const visionEndpoint = process.env.CLOTHING_ANALYSIS_ENDPOINT;

    if (visionEndpoint) {
      const response = await fetch(visionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      if (!response.ok) throw new ServiceError('Clothing analysis service failed.', 502);
      const payload = (await response.json()) as Partial<ClothingImageAnalysis>;
      return this.withComputedReadiness(payload);
    }

    const openAiModel = process.env.OPENAI_CLASSIFICATION_MODEL;
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiModel || !openAiKey) {
      throw new ServiceError('Missing clothing analysis provider. Configure CLOTHING_ANALYSIS_ENDPOINT or OPENAI_CLASSIFICATION_MODEL + OPENAI_API_KEY.', 500);
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openAiModel,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Classify clothing image quality and return JSON fields: contains_human,bounding_box,rotation_z_degrees,fully_visible,centered_score,front_view_score,background_clean_score,recommended_action.',
              },
              { type: 'input_image', image_url: imageUrl },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'clothing_analysis',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                contains_human: { type: 'boolean' },
                bounding_box: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                  },
                  required: ['x', 'y', 'width', 'height'],
                  additionalProperties: false,
                },
                rotation_z_degrees: { type: 'number' },
                fully_visible: { type: 'boolean' },
                centered_score: { type: 'number' },
                front_view_score: { type: 'number' },
                background_clean_score: { type: 'number' },
                recommended_action: {
                  type: 'string',
                  enum: ['approve_catalog_2d', 'refine_with_diffusion', 'normalize_only', 'request_reupload'],
                },
              },
              required: ['contains_human', 'bounding_box', 'rotation_z_degrees', 'fully_visible', 'centered_score', 'front_view_score', 'background_clean_score', 'recommended_action'],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ServiceError('OpenAI classification request failed.', 502);
    }

    const payload = (await response.json()) as { output_text?: string };
    const parsed = JSON.parse(payload.output_text ?? '{}') as Partial<ClothingImageAnalysis>;
    return this.withComputedReadiness(parsed);
  }

  private withComputedReadiness(payload: Partial<ClothingImageAnalysis>): ClothingImageAnalysis {
    const centered = Number(payload.centered_score ?? 0.5);
    const front = Number(payload.front_view_score ?? 0.5);
    const clean = Number(payload.background_clean_score ?? 0.5);
    const visibility = payload.fully_visible ? 1 : 0.35;
    const rotationPenalty = Math.max(0, Math.abs(Number(payload.rotation_z_degrees ?? 0)) / 45);

    const score = Math.max(0, Math.min(100, Math.round(((centered * 0.25 + front * 0.25 + clean * 0.25 + visibility * 0.25) - rotationPenalty * 0.2) * 100)));

    return {
      contains_human: Boolean(payload.contains_human),
      bounding_box: payload.bounding_box ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      rotation_z_degrees: Number(payload.rotation_z_degrees ?? 0),
      fully_visible: Boolean(payload.fully_visible),
      centered_score: centered,
      front_view_score: front,
      background_clean_score: clean,
      catalog_readiness_score: score,
      recommended_action: payload.recommended_action ?? (score >= 78 ? 'approve_catalog_2d' : score >= 55 ? 'normalize_only' : 'request_reupload'),
    };
  }
}
