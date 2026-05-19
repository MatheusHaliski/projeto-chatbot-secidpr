import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/app/lib/firebaseAdmin';

const COLLECTION = 'sai-userPosts';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')?.trim();
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).where('user_id', '==', userId).orderBy('created_at', 'desc').get();
  const posts = snapshot.docs.map((doc) => ({ post_id: doc.id, ...doc.data() }));
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.user_id || !body?.outfit_id || !body?.title) {
    return NextResponse.json({ error: 'Missing post payload fields' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const record = {
    user_id: String(body.user_id),
    outfit_id: String(body.outfit_id),
    scheme_id: body.scheme_id ? String(body.scheme_id) : undefined,
    title: String(body.title),
    caption: String(body.caption || ''),
    platforms: Array.isArray(body.platforms) ? body.platforms.map(String) : ['internal'],
    primary_platform: String(body.primary_platform || 'internal'),
    status: body.status || 'draft',
    preview_image_url: String(body.preview_image_url || '/welcome-newcomers.png'),
    export_image_url: body.export_image_url ? String(body.export_image_url) : undefined,
    visibility: body.visibility || 'private',
    platform_metadata: body.platform_metadata || {},
    created_at: now,
    updated_at: now,
    published_at: body.published_at ? String(body.published_at) : undefined,
  };

  const created = await db.collection(COLLECTION).add(record);
  return NextResponse.json({ post_id: created.id, ...record }, { status: 201 });
}
