import { getAdminFirestore } from '@/app/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

const USERS_COLLECTION = 'users';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')?.trim();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const db = getAdminFirestore();
    const snapshot = await db.collection(USERS_COLLECTION).doc(userId).get();

    if (!snapshot.exists) return NextResponse.json({ ok: true, profile: null });

    return NextResponse.json({ ok: true, profile: snapshot.data() ?? null });
  } catch {
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; displayName?: string; username?: string; email?: string; bio?: string; avatarUrl?: string };
    if (!body.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const payload = {
      name: body.displayName?.trim() || '',
      username: body.username?.trim() || '',
      email: body.email?.trim() || '',
      bio: body.bio?.trim() || '',
      photo_url: body.avatarUrl || '',
      updated_at: new Date().toISOString(),
    };

    const db = getAdminFirestore();
    await db.collection(USERS_COLLECTION).doc(body.userId).set(payload, { merge: true });

    return NextResponse.json({ ok: true, profile: payload });
  } catch {
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')?.trim();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const db = getAdminFirestore();
    await db.collection(USERS_COLLECTION).doc(userId).delete();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to delete account.' }, { status: 500 });
  }
}
