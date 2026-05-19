import { MannequinFitService } from '@/app/lib/fashion-ai/services/MannequinFitService';
import { MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';
import { WardrobeFitProfile } from '@/app/lib/fashion-ai/types/wardrobe-fit';

export type Tester2DLayer =
  | { type: 'mannequin-base'; imageUrl: string }
  | {
      type: 'garment';
      slot: 'top' | 'bottom' | 'shoes' | 'full_body' | 'accessory';
      imageUrl: string;
      x: number;
      y: number;
      width: number;
      height: number;
      clipMaskUrl?: string | null;
    };

const slotOrder: Array<'full_body' | 'top' | 'bottom' | 'shoes' | 'accessory'> = ['full_body', 'top', 'bottom', 'shoes', 'accessory'];

export class Tester2DRenderService {
  constructor(private readonly fitService = new MannequinFitService()) {}

  composeLayers(args: { mannequin: MannequinProfile; appliedPieces: WardrobeFitProfile[] }): Tester2DLayer[] {
    const layers: Tester2DLayer[] = [{ type: 'mannequin-base', imageUrl: args.mannequin.baseImageUrl }];

    const selectedBySlot = new Map<string, WardrobeFitProfile>();
    args.appliedPieces.forEach((piece) => {
      selectedBySlot.set(piece.pieceType, piece);
    });

    const hasFullBody = selectedBySlot.has('full_body');
    const slotsToRender = slotOrder.filter((slot) => (hasFullBody ? slot !== 'top' && slot !== 'bottom' : slot !== 'full_body'));

    slotsToRender.forEach((slot) => {
      const fitProfile = selectedBySlot.get(slot);
      if (!fitProfile) return;

      try {
        const fitted = this.fitService.buildFittedGarmentLayer({ mannequin: args.mannequin, fitProfile });
        layers.push({
          type: 'garment',
          slot: fitted.slot,
          imageUrl: fitted.assetUrl,
          x: fitted.x,
          y: fitted.y,
          width: fitted.width,
          height: fitted.height,
          clipMaskUrl: fitted.clipMaskUrl,
        });
      } catch (e) {
        console.warn('[Tester2DRenderService] skipping slot due to fit error', slot, e);
      }
    });

    return layers;
  }
}
