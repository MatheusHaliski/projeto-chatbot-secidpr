export const DRESS_TESTER_CATEGORIES = ['top', 'bottom', 'dress', 'shoes', 'bag', 'outerwear', 'accessory'] as const;

export type DressTesterCategory = (typeof DRESS_TESTER_CATEGORIES)[number];

export const DRESS_TESTER_GENDERS = ['female', 'male'] as const;
export type DressTesterGender = (typeof DRESS_TESTER_GENDERS)[number];

export type PieceAssetStatus = 'draft' | 'asset_pending' | 'asset_review' | 'ready_for_tester' | 'published';

export interface PieceAnchor2D {
  x: number;
  y: number;
  scale: number;
}

export interface Mannequin2D {
  mannequin_id: string;
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
  piece_id: string;
  name: string;
  brand_id: string;
  brand?: string;
  market_id: string;
  piece_type: DressTesterCategory;
  category_tier: string;
  mannequin_type: string;
  pose_code: string;
  render_layer: number;
  image_url: string;
  thumbnail_url: string;
  hide_layers: string[];
  hides_piece_types: DressTesterCategory[];
  conflicts_with: string[];
  compatible_piece_types: DressTesterCategory[];
  compatible_gender?: DressTesterGender[];
  anchor: PieceAnchor2D;
  anchor_points?: Record<string, PieceAnchor2D>;
  scale_adjustment?: number;
  wearstyles: string[];
  colors: string[];
  materials: string[];
  season: string;
  gender: string;
  render_image_url: string | null;
  asset_status: PieceAssetStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type OutfitSelection = {
  mannequin_id: string;
  pose_code: string;
} & Record<DressTesterCategory, string | null>;

export interface ResolvedLayer {
  piece_id: string;
  piece_type: DressTesterCategory;
  image_url: string;
  render_layer: number;
  anchor: PieceAnchor2D;
  name: string;
}

export const createEmptySelection = (mannequinId = '', poseCode = ''): OutfitSelection => ({
  mannequin_id: mannequinId,
  pose_code: poseCode,
  top: null,
  bottom: null,
  dress: null,
  shoes: null,
  bag: null,
  outerwear: null,
  accessory: null,
});
