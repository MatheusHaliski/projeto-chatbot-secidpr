export interface NormalizationInput {
  segmentedPngUrl: string;
  targetWidth?: number;
  targetHeight?: number;
  paddingRatio?: number;
}

export interface NormalizationResult {
  normalizedPngUrl: string;
  targetWidth: number;
  targetHeight: number;
  paddingRatio: number;
  transform: {
    translateX: number;
    translateY: number;
    scale: number;
    rotationZ: number;
  };
}

/**
 * Normalization metadata generator.
 * Production image transform should happen in dedicated imaging worker.
 */
export class ImageNormalizationService {
  async normalize(input: NormalizationInput): Promise<NormalizationResult> {
    const targetWidth = input.targetWidth ?? 1200;
    const targetHeight = input.targetHeight ?? 1600;
    const paddingRatio = input.paddingRatio ?? 0.08;

    return {
      normalizedPngUrl: input.segmentedPngUrl,
      targetWidth,
      targetHeight,
      paddingRatio,
      transform: {
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotationZ: 0,
      },
    };
  }
}
