import { BrandDetectionSource } from '@/app/backend/types/entities';
import { BrandsRepository } from '@/app/backend/repositories/BrandsRepository';

export interface BrandDetectionResult {
  brand_id_detected: string | null;
  brand_detection_confidence: number | null;
  brand_detection_source: BrandDetectionSource | null;
  detection_explanation: string;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

export class BrandDetectionService {
  constructor(private readonly brandsRepository = new BrandsRepository()) {}

  async detect(input: {
    selectedBrandId: string;
    name: string;
    imageUrl: string;
  }): Promise<BrandDetectionResult> {
    const activeBrands = await this.brandsRepository.listActive();
    const activeCatalogs = await this.brandsRepository.listActiveLogoCatalogs();

    const searchSpace = `${input.name} ${input.imageUrl}`.toLowerCase();
    const tokens = new Set(tokenize(searchSpace));

    const scored = activeBrands
      .map((brand) => {
        const catalog = activeCatalogs.find((entry) => entry.brand_id === brand.brand_id);
        const aliases = [brand.name, ...(catalog?.detection_aliases ?? [])].map((value) => value.toLowerCase());

        let score = 0;
        aliases.forEach((alias) => {
          if (!alias.trim()) return;
          if (searchSpace.includes(alias)) score += 0.7;
          const aliasTokens = tokenize(alias);
          const tokenHits = aliasTokens.filter((token) => tokens.has(token)).length;
          if (aliasTokens.length) {
            score += (tokenHits / aliasTokens.length) * 0.3;
          }
        });

        return {
          brand_id: brand.brand_id,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score >= 0.55) {
      return {
        brand_id_detected: best.brand_id,
        brand_detection_confidence: Number(best.score.toFixed(2)),
        brand_detection_source: 'hybrid',
        detection_explanation: 'Matched brand aliases from image URL/name against logo catalog.',
      };
    }

    const selectedBrandId = input.selectedBrandId.trim();
    if (selectedBrandId && selectedBrandId !== 'default') {
      return {
        brand_id_detected: selectedBrandId,
        brand_detection_confidence: 0.4,
        brand_detection_source: 'manual',
        detection_explanation: 'No reliable image alias match; falling back to selected form brand.',
      };
    }

    return {
      brand_id_detected: null,
      brand_detection_confidence: 0.2,
      brand_detection_source: 'hybrid',
      detection_explanation: 'No reliable brand match from image data. Item requires brand review.',
    };
  }
}
