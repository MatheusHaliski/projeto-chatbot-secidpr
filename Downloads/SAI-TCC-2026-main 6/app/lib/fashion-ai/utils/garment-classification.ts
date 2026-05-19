import { WardrobePieceType, WardrobeTargetGender } from '@/app/lib/fashion-ai/types/wardrobe-fit';

const TOP_TOKENS = ['shirt', 'camisa', 't-shirt', 'tee', 'blouse', 'jacket', 'hoodie', 'coat', 'upper', 'top'];
const BOTTOM_TOKENS = ['pants', 'jeans', 'shorts', 'skirt', 'lower', 'bottom', 'calça'];
const SHOE_TOKENS = ['shoe', 'sneaker', 'boot', 'heel', 'sandals'];
const FULL_BODY_TOKENS = ['dress', 'jumpsuit', 'macacão', 'one-piece', 'full'];
const MALE_GENDER_TOKENS = ['male', 'masculino', 'man', 'men', 'masc'];
const FEMALE_GENDER_TOKENS = ['female', 'feminino', 'woman', 'women', 'fem'];

function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsBoundedToken(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z])${escapeRegexToken(token)}([^a-z]|$)`, 'i').test(text);
}

export function classifyGarmentType(input: { pieceType?: string; name?: string }): WardrobePieceType {
  const text = `${input.pieceType ?? ''} ${input.name ?? ''}`.toLowerCase();

  if (FULL_BODY_TOKENS.some((token) => text.includes(token))) return 'full_body';
  if (TOP_TOKENS.some((token) => text.includes(token))) return 'top';
  if (BOTTOM_TOKENS.some((token) => text.includes(token))) return 'bottom';
  if (SHOE_TOKENS.some((token) => text.includes(token))) return 'shoes';
  return 'accessory';
}

export function classifyGarmentGender(input: { gender?: string; name?: string }): WardrobeTargetGender {
  const gender = String(input.gender ?? '').toLowerCase().trim();
  const text = `${gender} ${input.name ?? ''}`.toLowerCase();

  if (FEMALE_GENDER_TOKENS.some((token) => containsBoundedToken(text, token))) return 'female';
  if (MALE_GENDER_TOKENS.some((token) => containsBoundedToken(text, token))) return 'male';
  return 'unisex';
}
