export type EntityId = string;

export type ModelGenerationStatus =
  | 'queued_segmentation'
  | 'segmentation_done'
  | 'queued_base'
  | 'generating_base'
  | 'base_done'
  | 'queued_branding'
  | 'branding_in_progress'
  | 'queued_geometry_qa'
  | 'completed'
  | 'done'
  | 'retrying_generation'
  | 'failed_geometry_scope'
  | 'failed'
  | 'needs_brand_review'
  | 'needs_preparation'
  | 'processing'
  | 'processing_timeout';

export type BrandDetectionSource = 'manual' | 'ocr' | 'vision' | 'hybrid';

export interface PlacementProfile {
  profile_id: string;
  piece_type: 'upper_piece' | 'lower_piece' | 'shoes_piece' | 'accessory_piece';
  anchor: string;
  offset: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

export interface BrandLogoCatalog {
  brand_logo_catalog_id: EntityId;
  brand_id: EntityId;
  logo_image_url: string | null;
  logo_glb_url: string | null;
  placement_profiles: PlacementProfile[];
  detection_aliases: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: EntityId;
  name: string;
  email: string;
  photo_url: string | null;
  role: string;
  preferred_styles: string[];
  created_at: string;
  updated_at: string;
}

export interface Brand {
  brand_id: EntityId;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Market {
  market_id: EntityId;
  season: string;
  gender: string;
  created_at: string;
  updated_at: string;
}

export interface PieceItem {
  piece_item_id: EntityId;
  brand_id: EntityId;
  market_id: EntityId;
  name: string;
  image_url: string;
  piece_type: string;
  color: string;
  material: string;
  store_url: string | null;
  price_range: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface WardrobeImageAssets {
  raw_upload_image_url: string | null;
  segmented_png_url: string | null;
  cleaned_png_url?: string | null;
  normalized_2d_preview_url: string | null;
  approved_catalog_2d_url: string | null;
  model_3d_url: string | null;
}

export interface WardrobeImageAnalysis {
  contains_human: boolean;
  rotation_z_degrees: number;
  fully_visible: boolean;
  centered_score: number;
  front_view_score: number;
  background_clean_score: number;
  catalog_readiness_score: number;
  recommended_action: 'approve_catalog_2d' | 'refine_with_diffusion' | 'normalize_only' | 'request_reupload';
}

export interface WardrobeItem {
  wardrobe_item_id: EntityId;
  user_id: EntityId;
  brand_id: EntityId;
  market_id: EntityId;
  name: string;
  image_url: string;
  image_assets?: WardrobeImageAssets;
  image_analysis?: WardrobeImageAnalysis;
  model_3d_url: string | null;
  model_preview_url: string | null;
  model_base_3d_url: string | null;
  model_branded_3d_url: string | null;
  isolated_piece_image_url: string | null;
  segmentation_confidence: number | null;
  geometry_scope_passed: boolean;
  geometry_scope_score: number | null;
  generation_attempt_count: number;
  pipeline_stage_details: Record<string, unknown> | null;
  branding_error?: {
    message: string;
    failedStage: string;
    visibilityScore: number;
    placementScore: number;
    thresholds: Record<string, number>;
    retryable: boolean;
  } | null;
  model_status: ModelGenerationStatus;
  model_generation_error: string | null;
  brand_id_selected: string;
  brand_id_detected: string | null;
  brand_detection_confidence: number | null;
  brand_detection_source: BrandDetectionSource | null;
  brand_applied: boolean;
  placement_profile_id: string | null;
  branding_pass_version: string | null;
  piece_type: string;
  gender: string;
  color: string;
  material: string;
  style_tags: string[];
  occasion_tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scheme {
  scheme_id: EntityId;
  user_id: EntityId;
  title: string;
  description: string | null;
  creation_mode: 'manual' | 'ai';
  style: string;
  occasion: string;
  visibility: 'private' | 'public';
  community_indexed: boolean;
  cover_image_url: string | null;
  pieces?: SchemePieceSnapshot[];
  created_at: string;
  updated_at: string;
}

export interface SchemePieceSnapshot {
  id: string;
  slot: 'upper' | 'lower' | 'shoes' | 'accessory';
  sourceType: 'wardrobe' | 'suggested';
  sourceId: string;
  name: string;
  brand: string;
  brandLogoUrl?: string;
  category: 'Premium' | 'Standard' | 'Limited Edition' | 'Rare';
  pieceType: string;
  wearstyles: string[];
}

export interface SchemeItem {
  scheme_item_id: EntityId;
  scheme_id: EntityId;
  wardrobe_item_id: EntityId;
  slot: 'upper' | 'lower' | 'shoes' | 'accessory';
  sort_order: number;
  created_at: string;
}

export interface WardrobeViewItem {
  wardrobe_item_id: EntityId;
  name: string;
  image_url: string;
  image_assets?: WardrobeImageAssets;
  image_analysis?: WardrobeImageAnalysis;
  model_3d_url?: string | null;
  model_preview_url?: string | null;
  model_base_3d_url?: string | null;
  model_branded_3d_url?: string | null;
  isolated_piece_image_url?: string | null;
  segmentation_confidence?: number | null;
  geometry_scope_passed?: boolean | null;
  geometry_scope_score?: number | null;
  generation_attempt_count?: number;
  pipeline_stage_details?: Record<string, unknown> | null;
  branding_error?: {
    message: string;
    failedStage: string;
    visibilityScore: number;
    placementScore: number;
    thresholds: Record<string, number>;
    retryable: boolean;
  } | null;
  model_status?: ModelGenerationStatus;
  model_generation_error?: string | null;
  processingStartedAt?: string | null;
  fitProfile?: {
    preparationStatus?: 'pending' | 'processing' | 'ready' | 'preview_only' | 'failed' | string;
    normalizedBBox?: Record<string, unknown> | null;
    garmentAnchors?: Record<string, unknown> | null;
  };
  brand: string;
  brand_detection_confidence?: number | null;
  brand_detection_source?: BrandDetectionSource | null;
  brand_applied?: boolean;
  placement_profile_id?: string | null;
  branding_pass_version?: string | null;
  season: string;
  gender: string;
  piece_type: string;
}

export interface PieceItemSearchResult {
  piece_item_id: EntityId;
  image_url: string;
  image_assets?: WardrobeImageAssets;
  image_analysis?: WardrobeImageAnalysis;
  gender: string;
  brand: string;
  name: string;
  season: string;
  piece_type: string;
}

export interface WardrobeAnalysis {
  total_items: number;
  by_brand: Record<string, number>;
  by_season: Record<string, number>;
  by_gender: Record<string, number>;
  by_piece_type: Record<string, number>;
}

export interface CreateSchemeInput {
  user_id: EntityId;
  title: string;
  description?: string;
  creation_mode: 'manual' | 'ai';
  style: string;
  occasion: string;
  visibility: 'private' | 'public';
  community_indexed?: boolean;
  cover_image_url?: string;
  pieces?: SchemePieceSnapshot[];
  items: Array<{
    wardrobe_item_id: EntityId;
    slot: 'upper' | 'lower' | 'shoes' | 'accessory';
    sort_order: number;
  }>;
}

export interface SchemeWithItems {
  scheme: Scheme;
  items: Array<SchemeItem & { wardrobe_name: string; image_url: string }>;
  author: string;
}


export type PieceAssetStatus = 'draft' | 'asset_pending' | 'asset_review' | 'ready_for_tester' | 'published';

export interface Mannequin2D {
  mannequin_id: EntityId;
  name: string;
  gender: string;
  body_type: string;
  pose_code: string;
  canvas_width: number;
  canvas_height: number;
  preview_width: number;
  preview_height: number;
  base_image_url: string;
  shadow_image_url?: string;
  hair_back_url?: string;
  hair_front_url?: string;
  face_layer_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WardrobePiece2D {
  piece_id: EntityId;
  name: string;
  brand_id: EntityId;
  market_id: EntityId;
  piece_type: 'top' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'outerwear' | 'accessory';
  category_tier: string;
  mannequin_type: string;
  pose_code: string;
  render_layer: number;
  image_url: string;
  image_assets?: WardrobeImageAssets;
  image_analysis?: WardrobeImageAnalysis;
  thumbnail_url: string;
  hide_layers: string[];
  hides_piece_types: Array<'top' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'outerwear' | 'accessory'>;
  conflicts_with: string[];
  compatible_piece_types: Array<'top' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'outerwear' | 'accessory'>;
  anchor: { x: number; y: number; scale: number };
  wearstyles: string[];
  colors: string[];
  materials: string[];
  season: string;
  gender: string;
  asset_status: PieceAssetStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutfitSelection2D {
  mannequin_id: EntityId;
  pose_code: string;
  top: EntityId | null;
  bottom: EntityId | null;
  dress: EntityId | null;
  shoes: EntityId | null;
  bag: EntityId | null;
  outerwear: EntityId | null;
  accessory: EntityId | null;
  created_at: string;
  updated_at: string;
}

export type UserPostStatus = 'draft' | 'ready' | 'exported' | 'published' | 'failed';
export type OutfitExportStatus = 'queued' | 'ready' | 'downloaded' | 'published' | 'failed';
export type SocialPlatform = 'instagram' | 'facebook' | 'x' | 'internal';

export interface UserPost {
  post_id: EntityId;
  user_id: EntityId;
  outfit_id: EntityId;
  scheme_id?: EntityId;
  title: string;
  caption: string;
  platforms: SocialPlatform[];
  primary_platform: SocialPlatform;
  status: UserPostStatus;
  preview_image_url: string;
  export_image_url?: string;
  visibility: 'public' | 'private';
  platform_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface OutfitExport {
  export_id: EntityId;
  user_id: EntityId;
  outfit_id: EntityId;
  scheme_id?: EntityId;
  platform: SocialPlatform;
  format: 'square' | 'portrait' | 'story';
  export_mode: 'image_only' | 'image_with_caption';
  caption: string;
  asset_url: string;
  thumbnail_url: string;
  status: OutfitExportStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}
