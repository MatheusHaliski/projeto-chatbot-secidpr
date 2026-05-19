import { ServiceError } from './errors';

interface PieceIsolationInput {
  imageUrl: string;
  pieceType: string;
}

interface PieceIsolationResult {
  isolatedImageUrl: string;
  segmentationConfidence: number;
  stageDetails: Record<string, unknown>;
}

const PIECE_TYPE_HINTS: Record<string, string> = {
  upper_piece: 'upper garment',
  lower_piece: 'lower garment',
  shoes_piece: 'footwear',
  accessory_piece: 'accessory',
};

export class PieceIsolationService {
  async isolate(input: PieceIsolationInput): Promise<PieceIsolationResult> {
    const normalizedUrl = input.imageUrl.trim();
    if (!normalizedUrl) {
      throw new ServiceError('Image URL is required for piece isolation.', 400);
    }

    const pieceHint = PIECE_TYPE_HINTS[input.pieceType] ?? 'garment';
    const urlLower = normalizedUrl.toLowerCase();

    const keywordPenalty = ['person', 'fullbody', 'full-body', 'lookbook', 'model']
      .some((keyword) => urlLower.includes(keyword))
      ? 0.2
      : 0;

    const segmentationConfidence = Math.max(0.55, 0.9 - keywordPenalty);

    return {
      isolatedImageUrl: normalizedUrl,
      segmentationConfidence,
      stageDetails: {
        method: 'v1_url_heuristic_passthrough',
        piece_hint: pieceHint,
        keyword_penalty: keywordPenalty,
      },
    };
  }
}
