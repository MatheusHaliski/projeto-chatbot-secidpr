import { SchemeItem } from '@/app/backend/types/entities';
import { BaseRepository } from './BaseRepository';

const SCHEME_ITEMS_COLLECTION = 'sai-schemeitem';

interface CreateSchemeItemInput {
  scheme_id: string;
  wardrobe_item_id: string;
  slot: 'upper' | 'lower' | 'shoes' | 'accessory';
  sort_order: number;
}

export class SchemeItemsRepository extends BaseRepository {
  async createMany(items: CreateSchemeItemInput[]): Promise<SchemeItem[]> {
    if (!items.length) return [];

    const created: SchemeItem[] = [];
    for (const item of items) {
      const now = new Date().toISOString();
      const ref = await this.db.collection(SCHEME_ITEMS_COLLECTION).add({
        scheme_id: item.scheme_id,
        wardrobe_item_id: item.wardrobe_item_id,
        slot: item.slot,
        sort_order: item.sort_order,
        created_at: now,
      });

      created.push({ scheme_item_id: ref.id, ...item, created_at: now });
    }

    return created;
  }

  async findBySchemeId(schemeId: string): Promise<SchemeItem[]> {
    const query = await this.db
      .collection(SCHEME_ITEMS_COLLECTION)
      .where('scheme_id', '==', schemeId)
      .orderBy('sort_order', 'asc')
      .get();

    return query.docs.map((doc) => ({
      scheme_item_id: doc.id,
      ...(doc.data() as Omit<SchemeItem, 'scheme_item_id'>),
    }));
  }
}
