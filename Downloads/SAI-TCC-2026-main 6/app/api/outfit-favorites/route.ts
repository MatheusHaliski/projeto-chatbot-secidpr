import { getAdminFirestore } from '@/app/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

const COLLECTION = 'outfit_favorites';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string; schemeId?: string; favorite?: boolean };
    if (!body.schemeId) return NextResponse.json({ error: 'schemeId is required' }, { status: 400 });

    const userId = body.userId || request.headers.get('x-user-id') || 'anonymous';
    const favorite = Boolean(body.favorite);
    const docId = `${userId}_${body.schemeId}`;
    const db = getAdminFirestore();

    if (!favorite) {
      await db.collection(COLLECTION).doc(docId).delete();
      return NextResponse.json({ ok: true, favorite: false });
    }

    await db.collection(COLLECTION).doc(docId).set({
      userId,
      schemeId: body.schemeId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, favorite: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update favorites' }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')?.trim()
      || request.headers.get('x-user-id')
      || 'anonymous';
    const db = getAdminFirestore();
    const snapshot = await db.collection(COLLECTION).where('userId', '==', userId).get();
    const favorites = snapshot.docs.map((doc) => {
      const value = doc.data() as { schemeId?: string; createdAt?: string };
      return { schemeId: value.schemeId || '', createdAt: value.createdAt || '' };
    }).filter((entry) => entry.schemeId);

    return NextResponse.json({ ok: true, favorites });
  } catch {
    return NextResponse.json({ error: 'Unable to list favorites' }, { status: 500 });
  }
}
