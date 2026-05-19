import { SchemeItemsRepository } from '@/app/backend/repositories/SchemeItemsRepository';
import { SchemesRepository } from '@/app/backend/repositories/SchemesRepository';
import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';
import { ServiceError } from './errors';

export class SchemeItemsService {
  constructor(
    private readonly schemeItemsRepository = new SchemeItemsRepository(),
    private readonly schemesRepository = new SchemesRepository(),
    private readonly wardrobeItemsRepository = new WardrobeItemsRepository(),
  ) {}

  async createMany(items: Array<{ scheme_id: string; wardrobe_item_id: string; slot: 'upper' | 'lower' | 'shoes' | 'accessory'; sort_order: number }>) {
    for (const item of items) {
      if (!(await this.schemesRepository.existsById(item.scheme_id))) {
        throw new ServiceError(`Scheme ${item.scheme_id} not found`, 404);
      }
      if (!(await this.wardrobeItemsRepository.existsById(item.wardrobe_item_id))) {
        throw new ServiceError(`Wardrobe item ${item.wardrobe_item_id} not found`, 404);
      }
    }

    return this.schemeItemsRepository.createMany(items);
  }
}
