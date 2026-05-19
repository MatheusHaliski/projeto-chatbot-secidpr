import { BrandsService } from '@/app/backend/services/BrandsService';

export class BrandsController {
  constructor(private readonly brandsService = new BrandsService()) {}

  async listActive() {
    return this.brandsService.listActive();
  }

  async logoCatalogByBrandId(brandId: string) {
    return this.brandsService.getActiveLogoCatalogByBrandId(brandId);
  }
}
