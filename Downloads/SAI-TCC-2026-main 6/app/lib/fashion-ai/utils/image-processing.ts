export type ValidationResult = {
  warnings: string[];
  dimensionsOk: boolean;
  blurScore: number;
  garmentCoverage: number;
  isClothingLikely: boolean;
};

export function validateSourceImage(imageUrl: string): ValidationResult {
  const lowered = imageUrl.toLowerCase();
  const warnings: string[] = [];

  const dimensionsOk = !lowered.includes('tiny');
  const blurScore = lowered.includes('blur') ? 0.28 : 0.79;
  const garmentCoverage = lowered.includes('far') ? 0.22 : 0.61;
  const isClothingLikely = !lowered.includes('landscape') && !lowered.includes('food');

  if (!dimensionsOk) warnings.push('low_resolution');
  if (blurScore < 0.35) warnings.push('high_blur');
  if (garmentCoverage < 0.35) warnings.push('low_garment_coverage');
  if (!isClothingLikely) warnings.push('non_clothing_likelihood');

  return { warnings, dimensionsOk, blurScore, garmentCoverage, isClothingLikely };
}

export function detectHumanoidPresence(imageUrl: string): { detected: boolean; confidence: number } {
  const lowered = imageUrl.toLowerCase();
  const detected = ['person', 'model', 'lookbook', 'body', 'selfie'].some((token) => lowered.includes(token));
  return {
    detected,
    confidence: detected ? 0.74 : 0.12,
  };
}

export function extractGarmentOnly(imageUrl: string): { preparedAssetUrl: string; preparedMaskUrl: string | null; confident: boolean } {
  const humanoid = detectHumanoidPresence(imageUrl);
  const confident = !humanoid.detected;
  return {
    preparedAssetUrl: imageUrl,
    preparedMaskUrl: null,
    confident,
  };
}
