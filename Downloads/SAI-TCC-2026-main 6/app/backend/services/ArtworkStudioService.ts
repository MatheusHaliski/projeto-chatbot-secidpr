import { OpenAIArtworkClient } from '@/app/backend/integrations/openai/OpenAIArtworkClient';
import { ArtworkAssetsRepository } from '@/app/backend/repositories/ArtworkAssetsRepository';
import {
  ArtworkAsset,
  ArtworkGenerationResponse,
  ArtworkPromptBuildResult,
  ArtworkStudioInput,
  ArtworkVariation,
  OpenAIArtworkGenerationPayload,
  SaveArtworkRequest,
  ArtworkColorIntent,
} from '@/app/backend/types/artwork-studio';
import { getAdminStorageBucket } from '@/app/lib/firebaseAdmin';
import { buildBackgroundGenerationPlan, generateBackgroundVariations } from '@/app/lib/background-ai';
import { ServiceError } from './errors';

const STYLE_DIRECTIONS = {
  editorial_fashion: 'editorial fashion composition, high-end magazine-inspired visual hierarchy, layered background treatment',
  luxury_minimal: 'luxury editorial fashion background, refined premium composition, elegant negative space, subtle gradient transitions, polished art direction',
  futuristic_sport: 'futuristic sporty fashion artwork, dynamic graphic layering, sleek motion-inspired composition',
  streetwear: 'streetwear-inspired graphic background, layered bold shapes, contemporary fashion attitude',
  monochrome_premium: 'monochrome premium fashion artwork, black white silver inspired visual language, elegant contrast',
} as const;

const SHAPE_DIRECTIONS = {
  diamond: 'geometric diamond accents, crystalline directional forms',
  orb: 'soft orb-like rounded accents, subtle volumetric shape language',
  mesh: 'mesh-inspired gradients, fluid layered forms',
  panels: 'clean panel segmentation, framed graphic sections',
  mixed: 'mixed geometric editorial accents',
} as const;

const COMPOSITION_DIRECTIONS = {
  background: 'full background composition for outfit card design',
  shape_pack: 'decorative modular shape composition for fashion card layering',
  overlay: 'overlay-style decorative composition that can layer over a card',
  frame: 'premium decorative frame or border composition for card presentation',
} as const;

const PALETTE_DIRECTIONS = {
  monochrome: 'monochrome premium palette, black white silver tonal balance',
  cool_luxury: 'cool luxury palette, deep navy, cool steel and cyan-tinted highlights',
  warm_neutral: 'warm neutral palette, elegant beige, champagne and soft cocoa contrast',
  custom: 'custom color palette aligned with prompt direction',
} as const;

const COLOR_INTENT_DIRECTIONS: Record<ArtworkColorIntent, string> = {
  prompt_driven: 'color palette driven by the user prompt keywords',
  cool_blue: 'color direction focused on deep navy, cobalt, and icy cyan accents',
  emerald_luxury: 'color direction focused on emerald, teal, and mint highlights',
  sunset_warm: 'color direction focused on terracotta, amber, and peach glow',
  mono_chrome: 'color direction focused on black, graphite, silver, and white',
  neon_pop: 'color direction focused on vivid magenta, cyan, and electric violet',
};

const COLOR_INTENT_TO_PALETTE_HINT: Partial<Record<ArtworkColorIntent, string>> = {
  cool_blue: 'cool luxury',
  emerald_luxury: 'emerald + cyan',
  sunset_warm: 'warm neutral',
  mono_chrome: 'black + silver',
  neon_pop: 'vibrant neon',
};

type ArtworkGenerationProvider = {
  generate(input: ArtworkStudioInput, prompt: ArtworkPromptBuildResult): Promise<ArtworkGenerationResponse>;
};

function normalizePrompt(input: string) {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseSize(size: string) {
  const [w, h] = size.split('x').map((v) => Number(v));
  if (!w || !h) return { width: 1536, height: 1024 };
  return { width: w, height: h };
}

function asVariationFromFallback(input: ArtworkStudioInput, prompt: string, count: number): ArtworkVariation[] {
  const styleFromPreset = input.stylePreset.replaceAll('_', ' ');
  const paletteFromMode = input.paletteMode.replaceAll('_', ' ');
  const paletteHintFromIntent = input.colorIntent ? COLOR_INTENT_TO_PALETTE_HINT[input.colorIntent] : undefined;

  const plan = buildBackgroundGenerationPlan({
    prompt,
    palette: paletteHintFromIntent || paletteFromMode,
    style: styleFromPreset,
    mood: input.contrastLevel === 'high' ? 'bold' : input.contrastLevel === 'low' ? 'calm' : 'elegant',
  });

  return generateBackgroundVariations(plan, prompt, count).map((item, index) => ({
    variation_id: `procedural_${index + 1}`,
    preview_url: item.image,
    output_url: item.image,
    provider: 'procedural',
    provider_job_id: null,
    provider_model: 'procedural-svg',
    width: 1200,
    height: 800,
    metadata: { seed: item.seed, fallback: true },
  }));
}

export function buildArtworkPrompt(input: ArtworkStudioInput): ArtworkPromptBuildResult {
  const safeAreaText = input.safeAreaMode
    ? 'clear text-safe area, controlled visual density, clean negative space for outfit presentation and typography'
    : 'balanced composition and premium editorial spacing';

  const controlText = [
    typeof input.density === 'number' ? `density ${Math.max(0, Math.min(100, input.density))}` : null,
    input.contrastLevel ? `contrast ${input.contrastLevel}` : null,
    typeof input.blurStrength === 'number' ? `blur strength ${input.blurStrength}` : null,
    typeof input.glowIntensity === 'number' ? `glow intensity ${input.glowIntensity}` : null,
    typeof input.layeringDepth === 'number' ? `layering depth ${input.layeringDepth}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const userPrompt = input.prompt.trim() || 'premium editorial fashion artwork';
  const normalizedPrompt = normalizePrompt(userPrompt);

  const finalPrompt = [
    STYLE_DIRECTIONS[input.stylePreset],
    COMPOSITION_DIRECTIONS[input.compositionType],
    SHAPE_DIRECTIONS[input.shapeLanguage],
    PALETTE_DIRECTIONS[input.paletteMode],
    input.colorIntent ? COLOR_INTENT_DIRECTIONS[input.colorIntent] : null,
    safeAreaText,
    'design asset oriented output, premium fashion/editorial background utility',
    controlText,
    userPrompt,
  ]
    .filter(Boolean)
    .join(', ');

  const baseNegative = 'avoid faces, avoid people, avoid clutter, avoid chaotic scenery, avoid fantasy character focus, avoid unreadable typography collisions';
  const negativePrompt = [baseNegative, input.negativePrompt?.trim()].filter(Boolean).join(', ');

  return {
    normalizedPrompt,
    finalPrompt,
    negativePrompt,
    tags: [input.compositionType, input.stylePreset, input.paletteMode, input.shapeLanguage, 'fashion_ai', 'outfit_card'],
  };
}

class ProceduralArtworkProvider implements ArtworkGenerationProvider {
  async generate(input: ArtworkStudioInput, prompt: ArtworkPromptBuildResult): Promise<ArtworkGenerationResponse> {
    const variationCount = Math.min(4, Math.max(3, Number(input.variationCount ?? 4)));
    return {
      provider: 'procedural',
      providerModel: 'procedural-svg',
      prompt,
      variations: asVariationFromFallback(input, prompt.finalPrompt, variationCount),
      fallbackUsed: true,
      warnings: ['Using procedural generator fallback.'],
    };
  }
}

class OpenAIArtworkProvider implements ArtworkGenerationProvider {
  constructor(private readonly client: OpenAIArtworkClient) {}

  private async persistBase64AsImage(base64: string, variationId: string) {
    const bucket = getAdminStorageBucket();
    const path = `artwork-studio/${Date.now()}-${variationId}.png`;
    const file = bucket.file(path);
    const token = crypto.randomUUID();
    const buffer = Buffer.from(base64, 'base64');

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        metadata: { firebaseStorageDownloadTokens: token },
      },
      resumable: false,
      public: false,
      validation: 'md5',
    });

    const encodedPath = encodeURIComponent(path);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
    return { url };
  }

  async generate(input: ArtworkStudioInput, prompt: ArtworkPromptBuildResult): Promise<ArtworkGenerationResponse> {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new ServiceError('OpenAI API key is missing. Please configure OPENAI_API_KEY.', 503);
    }

    if (input.referenceImageUrl) {
      console.warn('artwork-studio: reference image provided; prompt-only mode currently active', {
        user_id: input.user_id,
      });
    }

    const sizeValue = process.env.OPENAI_IMAGES_SIZE?.trim() || '1536x1024';
    const quality = process.env.OPENAI_IMAGES_QUALITY?.trim() || 'high';
    const { width, height } = parseSize(sizeValue);
    const variationCount = Math.min(4, Math.max(3, Number(input.variationCount ?? 4)));

    const payload: OpenAIArtworkGenerationPayload = {
      prompt: prompt.finalPrompt,
      negativePrompt: prompt.negativePrompt,
      width,
      height,
      quality,
      referenceImageUrl: input.referenceImageUrl,
    };

    const results: ArtworkVariation[] = [];
    const warnings: string[] = [];

    for (let index = 0; index < variationCount; index += 1) {
      try {
        const result = await this.client.generate(payload);
        const variationId = `openai_${index + 1}_${Date.now()}`;
        const stored = await this.persistBase64AsImage(result.imageBase64, variationId);

        results.push({
          variation_id: variationId,
          preview_url: stored.url,
          output_url: stored.url,
          thumbnail_url: stored.url,
          width,
          height,
          provider: 'openai' as const,
          provider_job_id: null,
          provider_model: result.model,
          metadata: {
            revisedPrompt: result.revisedPrompt,
          },
        });
      } catch (error) {
        warnings.push(`Variation ${index + 1} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    if (!results.length) {
      throw new ServiceError('OpenAI returned no usable artwork variations.', 502);
    }

    return {
      provider: 'openai',
      providerModel: results[0]?.provider_model ?? null,
      prompt,
      variations: results,
      warnings: warnings.length ? warnings : undefined,
    };
  }
}

export class ArtworkStudioService {
  constructor(
    private readonly openAIClient = new OpenAIArtworkClient(),
    private readonly assetsRepository = new ArtworkAssetsRepository(),
  ) {}

  private validateInput(input: ArtworkStudioInput) {
    if (!input.user_id?.trim()) throw new ServiceError('Missing user_id.', 400);
    if (!input.prompt?.trim()) throw new ServiceError('Prompt is required.', 400);
  }

  private resolveProvider(): ArtworkGenerationProvider {
    const openAIEnabled = process.env.NEXT_PUBLIC_ENABLE_OPENAI_ARTWORK_STUDIO === 'true';
    if (!openAIEnabled) return new ProceduralArtworkProvider();
    return new OpenAIArtworkProvider(this.openAIClient);
  }

  private normalizeProceduralVariation(variation: ArtworkVariation): ArtworkVariation {
    const source = variation.preview_url || variation.output_url || variation.thumbnail_url || '';
    if (!source.startsWith('data:image/svg+xml;utf8,')) {
      return {
        ...variation,
        preview_url: variation.preview_url || variation.output_url,
        thumbnail_url: variation.thumbnail_url || variation.preview_url || variation.output_url,
      };
    }

    const encodedSvg = source.split(',', 2)[1] || '';
    const svgContent = decodeURIComponent(encodedSvg);
    const base64Svg = Buffer.from(svgContent, 'utf8').toString('base64');
    const safeDataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    return {
      ...variation,
      preview_url: safeDataUrl,
      output_url: safeDataUrl,
      thumbnail_url: safeDataUrl,
    };
  }

  async generate(input: ArtworkStudioInput): Promise<ArtworkGenerationResponse> {
    this.validateInput(input);
    const prompt = buildArtworkPrompt(input);
    const provider = this.resolveProvider();

    try {
      const generated = await provider.generate(input, prompt);
      console.debug('artwork_studio.raw_provider_response', {
        provider: generated.provider,
        variationCount: generated.variations.length,
        firstVariation: generated.variations[0] ?? null,
      });
      if (generated.provider !== 'procedural') return generated;

      const normalizedProcedural = generated.variations.map((variation) => this.normalizeProceduralVariation(variation));
      console.debug('artwork_studio.normalized_procedural_response', {
        variationCount: normalizedProcedural.length,
        firstVariation: normalizedProcedural[0] ?? null,
      });

      return {
        ...generated,
        variations: normalizedProcedural,
      };
    } catch (error) {
      console.error('artwork-studio.generate error', error);
      if (error instanceof ServiceError && error.statusCode === 503) {
        throw error;
      }
      const recoverable = error instanceof Error;
      if (recoverable) {
        const fallback = new ProceduralArtworkProvider();
        const result = await fallback.generate(input, prompt);
        const normalizedProcedural = result.variations.map((variation) => this.normalizeProceduralVariation(variation));
        console.debug('artwork_studio.recoverable_fallback_response', {
          variationCount: normalizedProcedural.length,
          firstVariation: normalizedProcedural[0] ?? null,
        });
        return {
          ...result,
          variations: normalizedProcedural,
          warnings: [...(result.warnings || []), 'Primary OpenAI provider failed. Fallback generation was used.'],
        };
      }
      throw new ServiceError('Artwork generation failed.', 502);
    }
  }

  async saveSelection(request: SaveArtworkRequest): Promise<ArtworkAsset> {
    const promptBuild = buildArtworkPrompt(request.input);
    const now = new Date().toISOString();

    return this.assetsRepository.create({
      user_id: request.user_id,
      prompt: request.input.prompt,
      normalized_prompt: promptBuild.normalizedPrompt,
      negative_prompt: promptBuild.negativePrompt,
      composition_type: request.input.compositionType,
      style_preset: request.input.stylePreset,
      palette_mode: request.input.paletteMode,
      shape_language: request.input.shapeLanguage,
      density: request.input.density,
      contrast_level: request.input.contrastLevel,
      blur_strength: request.input.blurStrength,
      glow_intensity: request.input.glowIntensity,
      layering_depth: request.input.layeringDepth,
      safe_area_mode: request.input.safeAreaMode,
      reference_image_url: request.input.referenceImageUrl ?? null,
      provider: request.variation.provider,
      provider_job_id: request.variation.provider_job_id ?? null,
      provider_model: request.variation.provider_model ?? null,
      preview_url: request.variation.preview_url,
      output_url: request.variation.output_url,
      thumbnail_url: request.variation.thumbnail_url ?? null,
      tags: promptBuild.tags,
      width: request.variation.width ?? null,
      height: request.variation.height ?? null,
      created_at: now,
      updated_at: now,
    });
  }

  async listByUser(userId: string) {
    if (!userId.trim()) throw new ServiceError('user_id is required.', 400);
    return this.assetsRepository.listByUser(userId.trim());
  }
}
