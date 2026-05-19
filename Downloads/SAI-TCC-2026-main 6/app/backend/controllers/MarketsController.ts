import { MarketsService } from '@/app/backend/services/MarketsService';

export class MarketsController {
  constructor(private readonly marketsService = new MarketsService()) {}

  async listAll() {
    return this.marketsService.listAll();
  }
}
