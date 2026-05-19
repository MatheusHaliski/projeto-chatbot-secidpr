import { CreateSchemeInput, Scheme, SchemeWithItems } from '@/app/backend/types/entities';
import { BaseRepository } from './BaseRepository';
import { UsersRepository } from './UsersRepository';

const SCHEMES_COLLECTION = 'sai-usersavedschemes';
const SCHEME_ITEMS_COLLECTION = 'sai-schemeitem';
const WARDROBE_ITEMS_COLLECTION = 'sai-wardrobeItems';

const toReadableSuggestedName = (input: string) => {
  const [, , slug = 'selected-piece'] = input.split(':');
  return slug
    .replaceAll('-', ' ')
    .split(' ')
    .filter(Boolean)
    .map((token) => `${token[0]?.toUpperCase() ?? ''}${token.slice(1)}`)
    .join(' ');
};

export class SchemesRepository extends BaseRepository {
  constructor(private readonly usersRepository = new UsersRepository()) {
    super();
  }

  async create(input: CreateSchemeInput): Promise<Scheme> {
    const now = new Date().toISOString();
    const payload: Omit<Scheme, 'scheme_id'> = {
      user_id: input.user_id,
      title: input.title,
      description: input.description ?? null,
      creation_mode: input.creation_mode,
      style: input.style,
      occasion: input.occasion,
      visibility: input.visibility,
      community_indexed: input.community_indexed ?? false,
      cover_image_url: input.cover_image_url ?? null,
      pieces: input.pieces ?? [],
      created_at: now,
      updated_at: now,
    };

    const ref = await this.db.collection(SCHEMES_COLLECTION).add(payload);
    return { scheme_id: ref.id, ...payload };
  }

  async existsById(schemeId: string): Promise<boolean> {
    const snap = await this.db.collection(SCHEMES_COLLECTION).doc(schemeId).get();
    return snap.exists;
  }

  async findPublic(): Promise<Scheme[]> {
    const snapshot = await this.db.collection(SCHEMES_COLLECTION).where('visibility', '==', 'public').get();
    return snapshot.docs.map((doc) => ({ scheme_id: doc.id, ...(doc.data() as Omit<Scheme, 'scheme_id'>) }));
  }

  async findByUser(userId: string): Promise<Scheme[]> {
    const snapshot = await this.db
      .collection(SCHEMES_COLLECTION)
      .where('user_id', '==', userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        scheme_id: doc.id,
        ...(doc.data() as Omit<Scheme, 'scheme_id'>),
      }))
      .sort((a, b) => {
        const aTime = Date.parse(a.created_at ?? '') || 0;
        const bTime = Date.parse(b.created_at ?? '') || 0;
        return bTime - aTime;
      });
  }

  async findByIdWithItems(schemeId: string): Promise<SchemeWithItems | null> {
    const schemeSnap = await this.db.collection(SCHEMES_COLLECTION).doc(schemeId).get();
    if (!schemeSnap.exists) return null;

    const scheme = { scheme_id: schemeSnap.id, ...(schemeSnap.data() as Omit<Scheme, 'scheme_id'>) };
    const itemSnapshot = await this.db
      .collection(SCHEME_ITEMS_COLLECTION)
      .where('scheme_id', '==', schemeId)
      .orderBy('sort_order', 'asc')
      .get();

    const itemDocs = itemSnapshot.docs;
    const wardrobeRefs = await Promise.all(
      itemDocs.map((itemDoc) => this.db.collection(WARDROBE_ITEMS_COLLECTION).doc(String(itemDoc.data().wardrobe_item_id)).get()),
    );

    const items = itemDocs.map((itemDoc, index) => {
      const wardrobeItemId = String(itemDoc.data().wardrobe_item_id);
      const isSuggested = wardrobeItemId.startsWith('suggested:');
      const wardrobe = wardrobeRefs[index].data() as Record<string, string> | undefined;
      return {
        scheme_item_id: itemDoc.id,
        scheme_id: schemeId,
        wardrobe_item_id: wardrobeItemId,
        slot: itemDoc.data().slot,
        sort_order: itemDoc.data().sort_order,
        created_at: itemDoc.data().created_at,
        wardrobe_name: wardrobe?.name ?? (isSuggested ? toReadableSuggestedName(wardrobeItemId) : 'Selected piece'),
        image_url: wardrobe?.image_url ?? '',
      };
    });

    const author = (await this.usersRepository.getById(scheme.user_id))?.name ?? 'Unknown';
    return { scheme, items, author };
  }
}
