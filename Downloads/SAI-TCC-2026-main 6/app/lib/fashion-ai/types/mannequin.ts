import { WardrobePieceType } from './wardrobe-fit';

export type MannequinSlotProfile = {
  bbox: { x: number; y: number; w: number; h: number };
  clipMaskUrl?: string | null;
  anchors?: {
    neckCenter?: { x: number; y: number };
    shoulderLeft?: { x: number; y: number };
    shoulderRight?: { x: number; y: number };
    waistLeft?: { x: number; y: number };
    waistRight?: { x: number; y: number };
  };
};

export type MannequinProfile = {
  id: 'male_v1' | 'female_v1';
  label: string;
  baseImageUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  slots: {
    top?: MannequinSlotProfile;
    bottom?: MannequinSlotProfile;
    shoes?: MannequinSlotProfile;
    full_body?: MannequinSlotProfile;
    accessory?: MannequinSlotProfile;
  };
  updatedAt: string;
};

export type FittedGarmentLayer = {
  assetUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  clipMaskUrl?: string | null;
  slot: WardrobePieceType;
};
