import { PieceItem, PieceItemSearchResult } from '@/app/backend/types/entities';
import { BaseRepository } from './BaseRepository';
import { BrandsRepository } from './BrandsRepository';
import { MarketsRepository } from './MarketsRepository';

const PIECE_ITEMS_COLLECTION = 'sai-pieceItems';

interface PieceItemFilters {
  season?: string;
  gender?: string;
  brand?: string;
  piece_type?: string;
}

export class PieceItemsRepository extends BaseRepository {
  constructor(
    private readonly brandsRepository = new BrandsRepository(),
    private readonly marketsRepository = new MarketsRepository(),
  ) {
    super();
  }

  async searchByBaseFilter(filters: PieceItemFilters): Promise<PieceItem[]> {
    let query: FirebaseFirestore.Query = this.db.collection(PIECE_ITEMS_COLLECTION).where('is_active', '==', true);
    if (filters.piece_type) {
      query = query.where('piece_type', '==', filters.piece_type);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      piece_item_id: doc.id,
      ...(doc.data() as Omit<PieceItem, 'piece_item_id'>),
    }));
  }

  async search(filters: PieceItemFilters): Promise<PieceItemSearchResult[]> {
    const brandMap = await this.brandsRepository.getNameMap();
    const marketsMap = await this.marketsRepository.getByIdMap();
    const baseItems = await this.searchByBaseFilter(filters);

    return baseItems
      .map((item) => {
        const market = marketsMap.get(item.market_id);
        return {
          piece_item_id: item.piece_item_id,
          image_url: item.image_url,
          gender: market?.gender ?? 'Unknown',
          brand: brandMap.get(item.brand_id) ?? 'Unknown',
          name: item.name,
          season: market?.season ?? 'Unknown',
          piece_type: item.piece_type,
        };
      })
      .filter((item) => !filters.season || item.season === filters.season)
      .filter((item) => !filters.gender || item.gender === filters.gender)
      .filter((item) => !filters.brand || item.brand === filters.brand);
  }
}
