import { BrandsRepository } from '@/app/backend/repositories/BrandsRepository';
import { MarketsRepository } from '@/app/backend/repositories/MarketsRepository';
import { PieceItemsRepository } from '@/app/backend/repositories/PieceItemsRepository';
import { PieceItemSearchResult } from '@/app/backend/types/entities';
import { ensureSaiCatalogSeeded } from '@/app/backend/services/BootstrapSaiCatalogService';

export class PieceItemsService {
  constructor(
    private readonly pieceRepo = new PieceItemsRepository(),
    private readonly brandsRepo = new BrandsRepository(),
    private readonly marketsRepo = new MarketsRepository(),
  ) {}

  async search(filters: { season?: string; gender?: string; brand?: string; piece_type?: string }): Promise<PieceItemSearchResult[]> {
    await ensureSaiCatalogSeeded();

    const items = await this.pieceRepo.searchByBaseFilter(filters);

    const enriched = await Promise.all(
      items.map(async (item) => {
        const [brand, market] = await Promise.all([
          this.brandsRepo.getById(item.brand_id),
          this.marketsRepo.getById(item.market_id),
        ]);

        return {
          piece_item_id: item.piece_item_id,
          image_url: item.image_url,
          gender: market?.gender ?? 'Unknown',
          brand: brand?.name ?? 'Unknown',
          name: item.name,
          season: market?.season ?? 'Unknown',
          piece_type: item.piece_type,
        };
      }),
    );

    return enriched
      .filter((item) => !filters.season || item.season === filters.season)
      .filter((item) => !filters.gender || item.gender === filters.gender)
      .filter((item) => !filters.brand || item.brand === filters.brand)
      .filter((item) => !filters.piece_type || item.piece_type === filters.piece_type);
  }
}
