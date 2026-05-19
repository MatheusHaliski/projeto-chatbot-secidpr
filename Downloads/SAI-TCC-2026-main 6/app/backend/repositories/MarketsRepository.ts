import { Market } from '@/app/backend/types/entities';
import { BaseRepository } from './BaseRepository';

const MARKETS_COLLECTION = 'sai-markets';

export class MarketsRepository extends BaseRepository {
  async listAll(): Promise<Market[]> {
    const snapshot = await this.db.collection(MARKETS_COLLECTION).get();
    return snapshot.docs.map((doc) => ({ market_id: doc.id, ...(doc.data() as Omit<Market, 'market_id'>) }));
  }


  async getById(marketId: string): Promise<Market | null> {
    const snap = await this.db.collection(MARKETS_COLLECTION).doc(marketId).get();
    if (!snap.exists) return null;
    return { market_id: snap.id, ...(snap.data() as Omit<Market, 'market_id'>) };
  }

  async existsById(marketId: string): Promise<boolean> {
    const snap = await this.db.collection(MARKETS_COLLECTION).doc(marketId).get();
    return snap.exists;
  }

  async getByIdMap(): Promise<Map<string, Market>> {
    const markets = await this.listAll();
    return new Map(markets.map((market) => [market.market_id, market]));
  }
}
