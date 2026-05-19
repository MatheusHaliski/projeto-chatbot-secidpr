import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    artwork_id?: string;
    apply_mode?: 'background' | 'overlay' | 'frame' | 'shape_pack';
  } | null;

  if (!body?.artwork_id) {
    return NextResponse.json({ success: false, error: 'artwork_id is required.' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    artwork_id: body.artwork_id,
    apply_mode: body.apply_mode ?? 'background',
  });
}
