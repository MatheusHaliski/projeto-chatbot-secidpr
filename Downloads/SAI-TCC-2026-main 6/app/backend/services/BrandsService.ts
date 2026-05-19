import { BrandsRepository } from '@/app/backend/repositories/BrandsRepository';

export class BrandsService {
  constructor(private readonly brandsRepository = new BrandsRepository()) {}

  async listActive() {
    return this.brandsRepository.listActive();
  }

  async getById(brandId: string) {
    return this.brandsRepository.getById(brandId);
  }

  async getActiveLogoCatalogByBrandId(brandId: string) {
    return this.brandsRepository.getActiveLogoCatalogByBrandId(brandId);
  }
}
