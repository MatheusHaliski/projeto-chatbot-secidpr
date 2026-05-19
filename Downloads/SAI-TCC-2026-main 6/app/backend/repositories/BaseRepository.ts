import { getAdminFirestore } from '@/app/lib/firebaseAdmin';

export class BaseRepository {
  protected get db() {
    return getAdminFirestore();
  }
}
