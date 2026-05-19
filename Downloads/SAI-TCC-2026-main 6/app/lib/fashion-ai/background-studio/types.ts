import type { OutfitBackgroundConfig } from '@/app/lib/outfit-card';

export type StudioTab = 'color' | 'gradient' | 'ai_artwork';

export type GeometryFamily = 'arrows' | 'waves' | 'diamond' | 'mesh' | 'circles' | 'triangles' | 'stars' | 'flowers' | 'beams' | 'panels' | 'mixed';

export type BackgroundPresetId =
  | 'selection_tiled_motif'
  | 'selection_editorial_logo'
  | 'selection_tonal_geometry'
  | 'selection_logo_image_fusion'
  | 'selection_tech_amber_energy'
  | 'selection_metallic_sport_identity'
  | 'selection_neon_motion_grid'
  | 'selection_luxury_fabric_monogram'
  | 'selection_editorial_collage'
  | 'selection_soft_premium_minimal';

export type PresetCategory = 'pattern_surface' | 'editorial_branding' | 'tech_energy' | 'hybrid_fusion';

export type RecommendedPreset = {
  id: BackgroundPresetId;
  category: PresetCategory;
  label: string;
  description: string;
};

export type OutfitMetadata = {
  style?: string;
  occasion?: string;
  visibility?: string;
  title?: string;
  brandIdentity?: string;
  palette?: string;
  mood?: string;
  wearstyles?: string[];
  brands?: string[];
};

export type PresetContext = {
  brandName: string;
  brandLogoUrl: string | null;
  heroColor: string;
};

export type PresetRuntimeState = {
  hasReferenceImage: boolean;
  hasBrandLogo: boolean;
};

export type ReferenceIntent = 'logo_pure' | 'logo_with_background' | 'symbol_texture' | 'editorial_image' | 'product_photo' | 'abstract_image' | 'fabric_pattern';

export type CompositionRecipe = {
  presetId: BackgroundPresetId;
  compositionMode: 'pattern' | 'hero' | 'fusion' | 'tech' | 'editorial' | 'minimal';
  colorStory: string;
  motifDensity: 'low' | 'medium' | 'high';
  logoWeight: number;
  imageWeight: number;
  geometryWeight: number;
  glowWeight: number;
  repeatMode?: 'grid' | 'staggered' | 'diagonal';
  safeAreaBias: 'high' | 'medium' | 'low';
};

export type RepeatedImagePatternOptions = {
  motifWidth: number;
  motifHeight: number;
  spacingX: number;
  spacingY: number;
  columns: number;
  rows: number;
  canvasWidth: number;
  canvasHeight: number;
  repeatMode: 'grid' | 'staggered' | 'diagonal' | 'scattered-balanced';
  minScale: number;
  maxScale: number;
  minOpacity: number;
  maxOpacity: number;
  maxRotationDeg: number;
  safeArea: { x: number; y: number; width: number; height: number };
  offsetX?: number;
  offsetY?: number;
};

export type MotifSeed = {
  source: string;
  aspectRatio: number;
  dominantColor: string;
  brandName: string;
};

export type CanvasTiledMotifOptions = {
  canvasWidth: number;
  canvasHeight: number;
  gridColumns: number;
  gridRows: number;
  tileOpacity: number;
};
