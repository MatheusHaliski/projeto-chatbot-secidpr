import { SchemeItemsRepository } from '@/app/backend/repositories/SchemeItemsRepository';
import { SchemesRepository } from '@/app/backend/repositories/SchemesRepository';
import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';
import { CreateSchemeInput } from '@/app/backend/types/entities';
import { ServiceError } from './errors';

export class SchemesService {
  constructor(
    private readonly schemesRepo = new SchemesRepository(),
    private readonly schemeItemsRepo = new SchemeItemsRepository(),
    private readonly wardrobeRepo = new WardrobeItemsRepository(),
  ) {}

  private async validateReferences(input: CreateSchemeInput) {
    for (const item of input.items) {
      if (item.wardrobe_item_id.startsWith('suggested:')) continue;

      const exists = await this.wardrobeRepo.existsById(item.wardrobe_item_id);
      if (!exists) throw new ServiceError(`Wardrobe item ${item.wardrobe_item_id} not found`, 404);
    }
  }

  async createManualScheme(input: CreateSchemeInput) {
    await this.validateReferences(input);
    const scheme = await this.schemesRepo.create({ ...input, creation_mode: 'manual' });
    const items = await this.schemeItemsRepo.createMany(input.items.map((item) => ({ ...item, scheme_id: scheme.scheme_id })));
    return { scheme, items };
  }

  async createAiScheme(input: CreateSchemeInput) {
    const aiSuggestedItems = input.items.length
      ? input.items
      : [
          { wardrobe_item_id: '1', slot: 'upper' as const, sort_order: 1 },
          { wardrobe_item_id: '3', slot: 'lower' as const, sort_order: 2 },
          { wardrobe_item_id: '4', slot: 'shoes' as const, sort_order: 3 },
        ];

    const aiInput = { ...input, creation_mode: 'ai' as const, items: aiSuggestedItems };
    await this.validateReferences(aiInput);

    const scheme = await this.schemesRepo.create(aiInput);
    const items = await this.schemeItemsRepo.createMany(aiSuggestedItems.map((item) => ({ ...item, scheme_id: scheme.scheme_id })));

    return { scheme, items, ai_note: 'AI mock applied a balanced smart-casual composition.' };
  }

  async listPublicSchemes() {
    return this.schemesRepo.findPublic();
  }

  async listSchemesByUser(userId: string) {
    return this.schemesRepo.findByUser(userId);
  }

  async getSchemeDetails(schemeId: string) {
    return this.schemesRepo.findByIdWithItems(schemeId);
  }
}
