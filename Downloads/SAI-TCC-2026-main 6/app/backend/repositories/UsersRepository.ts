import { User } from '@/app/backend/types/entities';
import { BaseRepository } from './BaseRepository';

const USERS_COLLECTION = 'users';

export class UsersRepository extends BaseRepository {
  async getById(userId: string): Promise<User | null> {
    const snap = await this.db.collection(USERS_COLLECTION).doc(userId).get();
    if (!snap.exists) return null;
    return { user_id: snap.id, ...(snap.data() as Omit<User, 'user_id'>) };
  }
}
