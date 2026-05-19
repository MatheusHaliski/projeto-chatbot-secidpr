import { FittedGarmentLayer, MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';
import { WardrobeFitProfile } from '@/app/lib/fashion-ai/types/wardrobe-fit';
import { isPieceCompatibleWithMannequin } from '@/app/lib/fashion-ai/utils/garment-compatibility';

export class MannequinFitService {
  buildFittedGarmentLayer(args: {
    mannequin: MannequinProfile;
    fitProfile: WardrobeFitProfile;
  }): FittedGarmentLayer {
    const { mannequin, fitProfile } = args;

    if (!isPieceCompatibleWithMannequin(fitProfile, mannequin.id, mannequin)) {
      throw new Error('Incompatible piece for mannequin or piece is not ready.');
    }

    const slot = mannequin.slots[fitProfile.pieceType];
    if (!slot) throw new Error(`Slot ${fitProfile.pieceType} not available for mannequin ${mannequin.id}.`);

    const bbox = slot.bbox;
    const normalizedBBox = fitProfile.normalizedBBox;
    const hasUsableNormalizedBBox =
      Boolean(normalizedBBox) &&
      (normalizedBBox?.w ?? 0) > 0.01 &&
      (normalizedBBox?.h ?? 0) > 0.01 &&
      (normalizedBBox?.w ?? 0) <= 1 &&
      (normalizedBBox?.h ?? 0) <= 1;

    // Scale the image so the garment content region fills the slot dimensions.
    const width = hasUsableNormalizedBBox ? bbox.w / (normalizedBBox?.w ?? 1) : bbox.w;
    const height = hasUsableNormalizedBBox ? bbox.h / (normalizedBBox?.h ?? 1) : bbox.h;

    // Horizontal: offset left so garment content left-edge aligns with slot left.
    const x = hasUsableNormalizedBBox ? bbox.x - (normalizedBBox?.x ?? 0) * width : bbox.x;

    // Vertical: prefer neck-anchor pinning over normalizedBBox.y.
    // When both the mannequin slot and the garment expose a neckCenter anchor, we
    // position the garment image so that its collar maps exactly to the mannequin neck
    // regardless of how much padding the product photo has above the collar.
    const mannequinNeckY = slot.anchors?.neckCenter?.y ?? null;
    const garmentNeckY = fitProfile.garmentAnchors?.neckCenter?.y ?? null;

    const y =
      mannequinNeckY !== null && garmentNeckY !== null
        ? mannequinNeckY - garmentNeckY * height
        : hasUsableNormalizedBBox
          ? bbox.y - (normalizedBBox?.y ?? 0) * height
          : bbox.y;

    return {
      assetUrl: fitProfile.preparedAssetUrl!,
      x,
      y,
      width,
      height,
      clipMaskUrl: slot.clipMaskUrl ?? fitProfile.preparedMaskUrl ?? null,
      slot: fitProfile.pieceType,
    };
  }
}
