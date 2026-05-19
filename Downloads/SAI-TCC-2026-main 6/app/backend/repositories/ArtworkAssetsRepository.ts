import { ArtworkAsset } from '@/app/backend/types/artwork-studio';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'fai-artworkAssets';

export class ArtworkAssetsRepository extends BaseRepository {
  async create(asset: Omit<ArtworkAsset, 'artwork_id'>): Promise<ArtworkAsset> {
    const ref = await this.db.collection(COLLECTION).add(asset);
    return { artwork_id: ref.id, ...asset };
  }

  async listByUser(userId: string): Promise<ArtworkAsset[]> {
    const snapshot = await this.db
      .collection(COLLECTION)
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .limit(80)
      .get();

    return snapshot.docs.map((doc) => ({ artwork_id: doc.id, ...(doc.data() as Omit<ArtworkAsset, 'artwork_id'>) }));
  }

  async findById(artworkId: string): Promise<ArtworkAsset | null> {
    const snap = await this.db.collection(COLLECTION).doc(artworkId).get();
    if (!snap.exists) return null;
    return { artwork_id: snap.id, ...(snap.data() as Omit<ArtworkAsset, 'artwork_id'>) };
  }

  async update(artworkId: string, patch: Partial<Omit<ArtworkAsset, 'artwork_id'>>) {
    await this.db.collection(COLLECTION).doc(artworkId).update({
      ...patch,
      updated_at: new Date().toISOString(),
    });
  }
}
