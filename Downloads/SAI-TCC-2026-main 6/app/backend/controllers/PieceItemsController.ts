import { PieceItemsService } from '@/app/backend/services/PieceItemsService';

export class PieceItemsController {
  constructor(private readonly pieceItemsService = new PieceItemsService()) {}

  async search(filters: { season?: string; gender?: string; brand?: string; piece_type?: string }) {
    return this.pieceItemsService.search(filters);
  }
}
