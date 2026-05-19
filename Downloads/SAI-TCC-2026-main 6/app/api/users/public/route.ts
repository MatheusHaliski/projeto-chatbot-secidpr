import { getAdminFirestore } from '@/app/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

const USERS_COLLECTION = 'users';

export async function GET() {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection(USERS_COLLECTION).limit(50).get();

    const users = snapshot.docs
      .map((doc) => {
        const data = doc.data() as {
          name?: string;
          username?: string;
          bio?: string;
          photo_url?: string;
        };

        return {
          user_id: doc.id,
          name: data.name?.trim() || 'SAI User',
          username: data.username?.trim() || data.name?.trim() || 'user',
          descriptor: data.bio?.trim() || 'Fashion creator',
          avatarUrl: data.photo_url?.trim() || '',
        };
      })
      .filter((user) => Boolean(user.user_id));

    return NextResponse.json({ ok: true, users });
  } catch {
    return NextResponse.json({ ok: false, users: [] }, { status: 500 });
  }
}
