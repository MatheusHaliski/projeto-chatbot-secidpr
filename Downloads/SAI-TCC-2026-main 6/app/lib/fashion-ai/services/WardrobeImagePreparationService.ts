import { WardrobeRepository } from '@/app/lib/fashion-ai/repositories/WardrobeRepository';
import { WardrobeFitProfile, WardrobeItemDocument, WardrobePieceType, WardrobeTargetGender } from '@/app/lib/fashion-ai/types/wardrobe-fit';
import { estimateGarmentAnchors } from '@/app/lib/fashion-ai/utils/garment-anchors';

const PROCESSING_VERSION = 'mvp-fitprofile-v1';
const MALE_GENDER_TOKENS = ['male', 'masculino', 'man', 'men', 'masc'];
const FEMALE_GENDER_TOKENS = ['female', 'feminino', 'woman', 'women', 'fem'];

function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsBoundedToken(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z])${escapeRegexToken(token)}([^a-z]|$)`, 'i').test(text);
}

type PreparationDebugInfo = {
  pieceId: string;
  wardrobeItemFound: boolean;
  imageUrlFound: boolean;
  inferredPieceType: WardrobePieceType;
  inferredTargetGender: WardrobeTargetGender;
  previousFitProfileStatus: WardrobeFitProfile['preparationStatus'] | 'missing';
  newPreparationStatus: WardrobeFitProfile['preparationStatus'];
  compatibleMannequins: Array<'male_v1' | 'female_v1'>;
  warnings: string[];
};

export class WardrobePreparationError extends Error {
  constructor(
    message: string,
    public readonly code: 'WARDROBE_ITEM_NOT_FOUND' | 'IMAGE_URL_MISSING' | 'INVALID_INPUT',
    public readonly status: number,
  ) {
    super(message);
  }
}

export class WardrobeImagePreparationService {
  constructor(private readonly wardrobeRepository = new WardrobeRepository()) {}

  async preparePieceForTester2D(pieceId: string): Promise<{ fitProfile: WardrobeFitProfile; debug: PreparationDebugInfo }> {
    console.info('[process-piece] loading wardrobe item', { pieceId });
    const piece = await this.wardrobeRepository.getById(pieceId);

    if (!piece) {
      throw new WardrobePreparationError('Wardrobe item not found.', 'WARDROBE_ITEM_NOT_FOUND', 404);
    }

    console.info('[process-piece] wardrobe item found', {
      pieceId,
      name: piece.name,
      hasImageUrl: Boolean(piece.image_url?.trim()),
      previousFitProfileStatus: piece.fitProfile?.preparationStatus ?? 'missing',
    });

    const imageUrl = piece.image_url?.trim();
    if (!imageUrl) {
      throw new WardrobePreparationError('Wardrobe item image_url is missing.', 'IMAGE_URL_MISSING', 400);
    }

    console.info('[process-piece] inferring pieceType', { pieceId, name: piece.name, piece_type: piece.piece_type ?? null });
    const inferredPieceType = this.inferPieceTypeFromWardrobeItem(piece);
    console.info('[process-piece] inferring targetGender', { pieceId, name: piece.name, gender: piece.gender ?? null });
    const inferredTargetGender = this.inferTargetGenderFromWardrobeItem(piece);
    const compatibleMannequins = this.resolveCompatibleMannequins(inferredTargetGender);

    const warnings: string[] = [];
    let preparationStatus: WardrobeFitProfile['preparationStatus'] = 'ready';

    if (!this.looksLikeUsableImageUrl(imageUrl)) {
      preparationStatus = 'failed';
      warnings.push('image_url_not_http_like');
    }

    console.info('[process-piece] building fitProfile', {
      pieceId,
      inferredPieceType,
      inferredTargetGender,
      newStatus: preparationStatus,
    });

    const fitProfile: WardrobeFitProfile = {
      pieceType: inferredPieceType,
      targetGender: inferredTargetGender,
      preparationStatus,
      originalImageUrl: imageUrl,
      // TODO: replace with transparent processed garment asset URL from segmentation/isolation pipeline.
      preparedAssetUrl: preparationStatus === 'ready' ? imageUrl : null,
      // TODO: replace with real generated mask URL when segmentation is available.
      preparedMaskUrl: null,
      compatibleMannequins,
      fitMode: 'masked-overlay',
      normalizedBBox: this.buildDefaultNormalizedBBox(inferredPieceType),
      garmentAnchors: this.buildDefaultGarmentAnchors(inferredPieceType),
      validationWarnings: warnings,
      preparationError: preparationStatus === 'failed' ? 'MVP processing rejected image_url format.' : null,
      preparedAt: preparationStatus === 'ready' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    console.info('[process-piece] saving fitProfile', {
      pieceId,
      oldStatus: piece.fitProfile?.preparationStatus ?? 'missing',
      newStatus: fitProfile.preparationStatus,
      inferredPieceType,
      inferredTargetGender,
    });

    await this.wardrobeRepository.updateFitProfile(pieceId, fitProfile, {
      lastProcessingAttemptAt: new Date().toISOString(),
      lastProcessingSource: 'api/wardrobe/process-piece',
      lastProcessingVersion: PROCESSING_VERSION,
    });

    const debug: PreparationDebugInfo = {
      pieceId,
      wardrobeItemFound: true,
      imageUrlFound: true,
      inferredPieceType,
      inferredTargetGender,
      previousFitProfileStatus: piece.fitProfile?.preparationStatus ?? 'missing',
      newPreparationStatus: fitProfile.preparationStatus,
      compatibleMannequins,
      warnings,
    };

    return { fitProfile, debug };
  }

  async processPieceForTester2D(pieceId: string): Promise<WardrobeFitProfile> {
    const result = await this.preparePieceForTester2D(pieceId);
    return result.fitProfile;
  }

  inferPieceTypeFromWardrobeItem(piece: Pick<WardrobeItemDocument, 'piece_type' | 'name'>): WardrobePieceType {
    const pieceTypeText = String(piece.piece_type ?? '').toLowerCase();
    const nameText = String(piece.name ?? '').toLowerCase();
    const text = `${pieceTypeText} ${nameText}`;

    if (text.includes('full') || text.includes('dress') || text.includes('jumpsuit')) return 'full_body';
    if (text.includes('shoe') || text.includes('sneaker') || text.includes('boot')) return 'shoes';
    if (text.includes('bottom') || text.includes('lower') || text.includes('pant') || text.includes('short') || text.includes('calça')) return 'bottom';
    if (text.includes('accessory') || text.includes('bag') || text.includes('belt') || text.includes('hat')) return 'accessory';
    if (text.includes('top') || text.includes('upper') || text.includes('shirt') || text.includes('camisa')) return 'top';

    return 'top';
  }

  inferTargetGenderFromWardrobeItem(piece: Pick<WardrobeItemDocument, 'gender' | 'name'>): WardrobeTargetGender {
    const genderText = String(piece.gender ?? '').toLowerCase();
    if (FEMALE_GENDER_TOKENS.some((token) => containsBoundedToken(genderText, token))) return 'female';
    if (MALE_GENDER_TOKENS.some((token) => containsBoundedToken(genderText, token))) return 'male';

    const nameText = String(piece.name ?? '').toLowerCase();
    if (FEMALE_GENDER_TOKENS.some((token) => containsBoundedToken(nameText, token))) return 'female';
    if (MALE_GENDER_TOKENS.some((token) => containsBoundedToken(nameText, token))) return 'male';

    return 'unisex';
  }

  buildDefaultNormalizedBBox(pieceType: WardrobePieceType): WardrobeFitProfile['normalizedBBox'] {
    // Values describe where the garment content sits within the garment product image (0–1),
    // not where it appears on the body. Typical e-commerce product photos center the garment
    // as the primary subject with ~10% padding on each side.
    // Collar starts very close to the top of a typical product photo (~4%).
    // Garment fills ~88% of width and ~90% of height (less side margin than previously assumed).
    if (pieceType === 'top') return { x: 0.06, y: 0.04, w: 0.88, h: 0.90 };
    if (pieceType === 'bottom') return { x: 0.12, y: 0.06, w: 0.76, h: 0.88 };
    if (pieceType === 'shoes') return { x: 0.10, y: 0.10, w: 0.80, h: 0.80 };
    if (pieceType === 'full_body') return { x: 0.10, y: 0.04, w: 0.80, h: 0.92 };
    return { x: 0.15, y: 0.12, w: 0.70, h: 0.76 };
  }

  buildDefaultGarmentAnchors(pieceType: WardrobePieceType): WardrobeFitProfile['garmentAnchors'] {
    if (pieceType === 'top') return estimateGarmentAnchors('top');
    return estimateGarmentAnchors(pieceType);
  }

  private resolveCompatibleMannequins(targetGender: WardrobeTargetGender): Array<'male_v1' | 'female_v1'> {
    if (targetGender === 'male') return ['male_v1'];
    if (targetGender === 'female') return ['female_v1'];
    return ['male_v1', 'female_v1'];
  }

  private looksLikeUsableImageUrl(value: string): boolean {
    return /^https?:\/\//.test(value) || value.startsWith('/');
  }
}
