import { SchemeItemsService } from '@/app/backend/services/SchemeItemsService';

export class SchemeItemsController {
  constructor(private readonly schemeItemsService = new SchemeItemsService()) {}

  async createMany(items: Array<{ scheme_id: string; wardrobe_item_id: string; slot: 'upper' | 'lower' | 'shoes' | 'accessory'; sort_order: number }>) {
    return this.schemeItemsService.createMany(items);
  }
}
