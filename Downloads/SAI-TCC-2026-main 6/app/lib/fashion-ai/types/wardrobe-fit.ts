export type WardrobePieceType = 'top' | 'bottom' | 'shoes' | 'full_body' | 'accessory';
export type WardrobeTargetGender = 'male' | 'female' | 'unisex';
export type PiecePreparationStatus = 'pending' | 'processing' | 'ready' | 'preview_only' | 'failed';

export type NormalizedBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AnchorPoint = { x: number; y: number };

export type GarmentAnchors = {
  neckCenter?: AnchorPoint;
  shoulderLeft?: AnchorPoint;
  shoulderRight?: AnchorPoint;
  waistLeft?: AnchorPoint;
  waistRight?: AnchorPoint;
  hemCenter?: AnchorPoint;
};

export type WardrobeFitProfile = {
  pieceType: WardrobePieceType;
  targetGender: WardrobeTargetGender;
  preparationStatus: PiecePreparationStatus;
  originalImageUrl: string;
  preparedAssetUrl?: string | null;
  preparedMaskUrl?: string | null;
  compatibleMannequins: Array<'male_v1' | 'female_v1'>;
  fitMode: 'overlay' | 'masked-overlay';
  normalizedBBox?: NormalizedBBox | null;
  garmentAnchors?: GarmentAnchors | null;
  validationWarnings?: string[];
  preparationError?: string | null;
  preparedAt?: string | null;
  updatedAt: string;
};

export type WardrobeItemDocument = {
  id: string;
  name: string;
  image_url: string;
  piece_type?: string;
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
  fitProfile?: WardrobeFitProfile;
};
