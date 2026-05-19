import { Brand, BrandLogoCatalog } from '@/app/backend/types/entities';
import { BaseRepository } from './BaseRepository';

const BRANDS_COLLECTION = 'sai-brands';
const BRAND_LOGO_CATALOG_COLLECTION = 'sai-brandLogoCatalog';

export class BrandsRepository extends BaseRepository {
  async listActive(): Promise<Brand[]> {
    const snapshot = await this.db
      .collection(BRANDS_COLLECTION)
      .where('is_active', '==', true)
      .get();

    return snapshot.docs.map((doc) => ({
      brand_id: doc.id,
      ...(doc.data() as Omit<Brand, 'brand_id'>),
    }));
  }

  async getById(brandId: string): Promise<Brand | null> {
    const snap = await this.db.collection(BRANDS_COLLECTION).doc(brandId).get();

    if (!snap.exists) {
      return null;
    }

    return {
      brand_id: snap.id,
      ...(snap.data() as Omit<Brand, 'brand_id'>),
    };
  }

  async existsById(brandId: string): Promise<boolean> {
    const snap = await this.db.collection(BRANDS_COLLECTION).doc(brandId).get();
    return snap.exists;
  }

  async getNameMap(): Promise<Map<string, string>> {
    const active = await this.listActive();
    return new Map(active.map((brand) => [brand.brand_id, brand.name]));
  }

  async listActiveLogoCatalogs(): Promise<BrandLogoCatalog[]> {
    const snapshot = await this.db
      .collection(BRAND_LOGO_CATALOG_COLLECTION)
      .where('is_active', '==', true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<BrandLogoCatalog, 'brand_logo_catalog_id'>;

      return {
        brand_logo_catalog_id: doc.id,
        ...data,
        detection_aliases: Array.isArray(data.detection_aliases)
          ? data.detection_aliases
          : [],
      };
    });
  }

  async getActiveLogoCatalogByBrandId(
    brandId: string,
  ): Promise<BrandLogoCatalog | null> {
    const snapshot = await this.db
      .collection(BRAND_LOGO_CATALOG_COLLECTION)
      .where('brand_id', '==', brandId)
      .where('is_active', '==', true)
      .limit(1)
      .get();

    const first = snapshot.docs[0];

    if (!first) {
      return null;
    }

    const data = first.data() as Omit<BrandLogoCatalog, 'brand_logo_catalog_id'>;

    return {
      brand_logo_catalog_id: first.id,
      ...data,
      detection_aliases: Array.isArray(data.detection_aliases)
        ? data.detection_aliases
        : [],
    };
  }

  async upsertLogoCatalog(input: {
    brandId: string;
    logoImageUrl: string | null;
    logoGlbUrl: string | null;
    placementProfiles: BrandLogoCatalog['placement_profiles'];
    detectionAliases?: string[];
  }): Promise<void> {
    const now = new Date().toISOString();
    const docId = `catalog_${input.brandId}`;

    await this.db
      .collection(BRAND_LOGO_CATALOG_COLLECTION)
      .doc(docId)
      .set(
        {
          brand_id: input.brandId,
          logo_image_url: input.logoImageUrl,
          logo_glb_url: input.logoGlbUrl,
          placement_profiles: input.placementProfiles,
          detection_aliases: input.detectionAliases ?? [],
          is_active: true,
          updated_at: now,
          created_at: now,
        },
        { merge: true },
      );
  }
}
