import { DressTesterCategory, PieceAnchor2D, ResolvedLayer, WardrobePiece2D } from '@/app/lib/dress-tester-models';

export interface OverlaySelection {
  [key: string]: string | null;
}

const SLOT_PRIORITY: Record<DressTesterCategory, number> = {
  top: 30,
  bottom: 25,
  dress: 35,
  shoes: 15,
  bag: 45,
  outerwear: 50,
  accessory: 55,
};

export class ClothingOverlayService {
  resolveLayers(pieces: WardrobePiece2D[], selection: OverlaySelection, poseCode: string): ResolvedLayer[] {
    return pieces
      .filter((piece) => selection[piece.piece_type] === piece.piece_id)
      .map((piece) => {
        const mappedAnchor = this.resolveAnchor(piece, poseCode);
        return {
          piece_id: piece.piece_id,
          piece_type: piece.piece_type,
          image_url: piece.image_url,
          render_layer: piece.render_layer || SLOT_PRIORITY[piece.piece_type],
          anchor: mappedAnchor,
          name: piece.name,
        };
      })
      .sort((a, b) => a.render_layer - b.render_layer);
  }

  private resolveAnchor(piece: WardrobePiece2D, poseCode: string): PieceAnchor2D {
    const poseAnchor = piece.anchor_points?.[poseCode] ?? piece.anchor;
    return {
      ...poseAnchor,
      scale: piece.scale_adjustment ?? poseAnchor.scale,
    };
  }
}
