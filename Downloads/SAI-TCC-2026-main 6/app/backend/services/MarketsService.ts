import { MarketsRepository } from '@/app/backend/repositories/MarketsRepository';

export class MarketsService {
  constructor(private readonly marketsRepository = new MarketsRepository()) {}

  async listAll() {
    return this.marketsRepository.listAll();
  }

  async getById(marketId: string) {
    return this.marketsRepository.getById(marketId);
  }
}
