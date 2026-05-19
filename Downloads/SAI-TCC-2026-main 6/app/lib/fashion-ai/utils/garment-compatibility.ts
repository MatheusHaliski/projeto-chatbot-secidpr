import { MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';
import { WardrobeFitProfile } from '@/app/lib/fashion-ai/types/wardrobe-fit';

export function isPieceCompatibleWithMannequin(
  fitProfile: WardrobeFitProfile,
  mannequinId: 'male_v1' | 'female_v1',
  mannequin?: MannequinProfile,
): boolean {
  if (fitProfile.preparationStatus !== 'ready') return false;
  if (!fitProfile.preparedAssetUrl) return false;

  if (fitProfile.targetGender === 'male' && mannequinId !== 'male_v1') return false;
  if (fitProfile.targetGender === 'female' && mannequinId !== 'female_v1') return false;

  if (!Array.isArray(fitProfile.compatibleMannequins) || !fitProfile.compatibleMannequins.includes(mannequinId)) return false;

  if (mannequin) {
    const slot = mannequin.slots[fitProfile.pieceType];
    if (!slot) return false;
  }

  return true;
}
