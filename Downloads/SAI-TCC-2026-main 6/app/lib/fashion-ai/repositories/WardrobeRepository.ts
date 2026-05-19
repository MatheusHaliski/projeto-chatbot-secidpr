import { getAdminFirestore } from '@/app/lib/firebaseAdmin';
import { WardrobeFitProfile, WardrobeItemDocument } from '@/app/lib/fashion-ai/types/wardrobe-fit';
import { FieldPath } from 'firebase-admin/firestore';

const COLLECTION = 'sai-wardrobeItems';

export class WardrobeRepository {
  private mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): WardrobeItemDocument {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      name: String(data.name ?? ''),
      image_url: String(data.image_url ?? ''),
      piece_type: typeof data.piece_type === 'string' ? data.piece_type : undefined,
      gender: typeof data.gender === 'string' ? data.gender : undefined,
      createdAt: typeof data.created_at === 'string' ? data.created_at : undefined,
      updatedAt: typeof data.updated_at === 'string' ? data.updated_at : undefined,
      fitProfile: (data.fitProfile as WardrobeFitProfile | undefined) ?? undefined,
    };
  }

  async listAll(maxItems = 100): Promise<WardrobeItemDocument[]> {
    const safeLimit = Math.max(1, Math.floor(maxItems));
    const snap = await getAdminFirestore()
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  async listPage(params?: { limit?: number; startAfterId?: string }): Promise<WardrobeItemDocument[]> {
    const pageSize = Math.max(1, Math.floor(params?.limit ?? 100));
    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db
      .collection(COLLECTION)
      .orderBy(FieldPath.documentId())
      .limit(pageSize);

    if (params?.startAfterId) {
      query = query.startAfter(params.startAfterId);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  async getById(pieceId: string): Promise<WardrobeItemDocument | null> {
    const snap = await getAdminFirestore().collection(COLLECTION).doc(pieceId).get();
    if (!snap.exists) return null;
    const data = snap.data() as Record<string, unknown>;

    return {
      id: snap.id,
      name: String(data.name ?? ''),
      image_url: String(data.image_url ?? ''),
      piece_type: typeof data.piece_type === 'string' ? data.piece_type : undefined,
      gender: typeof data.gender === 'string' ? data.gender : undefined,
      createdAt: typeof data.created_at === 'string' ? data.created_at : undefined,
      updatedAt: typeof data.updated_at === 'string' ? data.updated_at : undefined,
      fitProfile: (data.fitProfile as WardrobeFitProfile | undefined) ?? undefined,
    };
  }

  async updateFitProfile(
    pieceId: string,
    fitProfile: WardrobeFitProfile,
    debugMeta?: {
      lastProcessingAttemptAt?: string;
      lastProcessingSource?: string;
      lastProcessingVersion?: string;
    },
  ): Promise<void> {
    await getAdminFirestore().collection(COLLECTION).doc(pieceId).set({
      fitProfile,
      ...(debugMeta ?? {}),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  async markPending(pieceId: string, imageUrl: string, pieceType: string, gender: string): Promise<void> {
    const now = new Date().toISOString();
    await getAdminFirestore().collection(COLLECTION).doc(pieceId).set({
      fitProfile: {
        pieceType: pieceType as WardrobeFitProfile['pieceType'],
        targetGender: (gender as WardrobeFitProfile['targetGender']) || 'unisex',
        preparationStatus: 'pending',
        originalImageUrl: imageUrl,
        compatibleMannequins: ['male_v1', 'female_v1'],
        fitMode: 'overlay',
        validationWarnings: [],
        preparationError: null,
        preparedAt: null,
        updatedAt: now,
      },
      updated_at: now,
    }, { merge: true });
  }
}
