export type ArtworkCompositionType = 'background' | 'shape_pack' | 'overlay' | 'frame';
export type ArtworkStylePreset =
  | 'editorial_fashion'
  | 'luxury_minimal'
  | 'futuristic_sport'
  | 'streetwear'
  | 'monochrome_premium';
export type ArtworkPaletteMode = 'monochrome' | 'cool_luxury' | 'warm_neutral' | 'custom';
export type ArtworkShapeLanguage = 'diamond' | 'orb' | 'mesh' | 'panels' | 'mixed';
export type ArtworkContrastLevel = 'low' | 'medium' | 'high';
export type ArtworkColorIntent = 'prompt_driven' | 'cool_blue' | 'emerald_luxury' | 'sunset_warm' | 'mono_chrome' | 'neon_pop';

export type ArtworkStudioInput = {
  user_id: string;
  prompt: string;
  negativePrompt?: string;
  compositionType: ArtworkCompositionType;
  stylePreset: ArtworkStylePreset;
  paletteMode: ArtworkPaletteMode;
  shapeLanguage: ArtworkShapeLanguage;
  generationMode?: 'preset_assisted' | 'hybrid' | 'text_prompt_pure';
  density?: number;
  contrastLevel?: ArtworkContrastLevel;
  blurStrength?: number;
  glowIntensity?: number;
  layeringDepth?: number;
  safeAreaMode?: boolean;
  referenceImageUrl?: string;
  referenceImageAssetId?: string;
  variationCount?: number;
  colorIntent?: ArtworkColorIntent;
};

export type ArtworkVariation = {
  variation_id: string;
  preview_url: string;
  output_url: string;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  provider: 'openai' | 'procedural';
  provider_job_id?: string | null;
  provider_model?: string | null;
  metadata?: Record<string, unknown>;
};

export type ArtworkAsset = {
  artwork_id: string;
  user_id: string;
  prompt: string;
  normalized_prompt: string;
  negative_prompt?: string;
  composition_type: ArtworkCompositionType;
  style_preset: ArtworkStylePreset;
  palette_mode: ArtworkPaletteMode;
  shape_language: ArtworkShapeLanguage;
  density?: number | string;
  contrast_level?: ArtworkContrastLevel;
  blur_strength?: number;
  glow_intensity?: number;
  layering_depth?: number;
  safe_area_mode?: boolean;
  reference_image_url?: string | null;
  provider: 'openai' | 'procedural';
  provider_job_id?: string | null;
  provider_model?: string | null;
  preview_url: string;
  output_url: string;
  thumbnail_url?: string | null;
  tags?: string[];
  width?: number | null;
  height?: number | null;
  created_at: string;
  updated_at: string;
};

export type ArtworkPromptBuildResult = {
  normalizedPrompt: string;
  finalPrompt: string;
  negativePrompt: string;
  tags: string[];
};

export type OpenAIArtworkGenerationPayload = {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  quality: string;
  referenceImageUrl?: string;
};

export type OpenAIArtworkGenerationResult = {
  imageBase64: string;
  model: string;
  revisedPrompt?: string | null;
};

export type ArtworkGenerationResponse = {
  provider: 'openai' | 'procedural';
  prompt: ArtworkPromptBuildResult;
  variations: ArtworkVariation[];
  providerModel?: string | null;
  warnings?: string[];
  fallbackUsed?: boolean;
};

export type GenerateArtworkRequest = ArtworkStudioInput;

export type GenerateArtworkResponse = {
  success: boolean;
  data?: ArtworkGenerationResponse;
  error?: string;
  code?: string;
};

export type SaveArtworkRequest = {
  user_id: string;
  input: ArtworkStudioInput;
  variation: ArtworkVariation;
};

export type SaveArtworkResponse = {
  success: boolean;
  asset?: ArtworkAsset;
  error?: string;
};

export type ListArtworkResponse = {
  success: boolean;
  assets: ArtworkAsset[];
  error?: string;
};
