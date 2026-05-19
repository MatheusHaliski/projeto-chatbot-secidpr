import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/app/lib/firebaseAdmin';

const COLLECTION = 'sai-outfitExports';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')?.trim();
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).where('user_id', '==', userId).orderBy('created_at', 'desc').get();
  const records = snapshot.docs.map((doc) => ({ export_id: doc.id, ...doc.data() }));
  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.userId || !body?.outfitId || !body?.platform || !body?.format || !body?.sourceImageUrl) {
    return NextResponse.json({ error: 'Missing export payload fields' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const db = getAdminFirestore();

  const record = {
    user_id: String(body.userId),
    outfit_id: String(body.outfitId),
    scheme_id: body.schemeId ? String(body.schemeId) : undefined,
    platform: body.platform,
    format: body.format,
    export_mode: body.exportMode || 'image_only',
    caption: String(body.caption || ''),
    asset_url: String(body.sourceImageUrl),
    thumbnail_url: String(body.sourceImageUrl),
    status: 'ready',
    platform_metadata: {
      pipeline_phase: 'phase-1-downloadable-export',
      ready_for_publishing: true,
    },
    created_at: now,
    updated_at: now,
  };

  const created = await db.collection(COLLECTION).add(record);
  return NextResponse.json({ export_id: created.id, ...record }, { status: 201 });
}
