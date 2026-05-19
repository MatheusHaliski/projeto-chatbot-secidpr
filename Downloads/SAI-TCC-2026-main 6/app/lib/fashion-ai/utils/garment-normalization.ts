import { NormalizedBBox } from '@/app/lib/fashion-ai/types/wardrobe-fit';

export function normalizeGarmentAsset(_imageUrl: string): { normalizedBBox: NormalizedBBox; canvas: { width: number; height: number } } {
  void _imageUrl;
  // Deterministic MVP defaults on a 1024x1024 transparent canvas.
  return {
    normalizedBBox: {
      x: 0.16,
      y: 0.08,
      w: 0.68,
      h: 0.84,
    },
    canvas: { width: 1024, height: 1024 },
  };
}
