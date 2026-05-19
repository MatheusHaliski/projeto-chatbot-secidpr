import { GarmentAnchors, WardrobePieceType } from '@/app/lib/fashion-ai/types/wardrobe-fit';

export function estimateGarmentAnchors(pieceType: WardrobePieceType): GarmentAnchors | null {
  if (pieceType === 'top') {
    // Typical e-commerce product photo: collar very close to top (~5-7%), shoulders
    // at ~14-16%, hem at ~88-92%.  Previous y=0.12 was too low, pushing the shirt down.
    return {
      neckCenter: { x: 0.5, y: 0.06 },
      shoulderLeft: { x: 0.20, y: 0.14 },
      shoulderRight: { x: 0.80, y: 0.14 },
      waistLeft: { x: 0.26, y: 0.70 },
      waistRight: { x: 0.74, y: 0.70 },
      hemCenter: { x: 0.5, y: 0.90 },
    };
  }

  if (pieceType === 'bottom') {
    return {
      waistLeft: { x: 0.34, y: 0.12 },
      waistRight: { x: 0.66, y: 0.12 },
      hemCenter: { x: 0.5, y: 0.88 },
    };
  }

  return null;
}
