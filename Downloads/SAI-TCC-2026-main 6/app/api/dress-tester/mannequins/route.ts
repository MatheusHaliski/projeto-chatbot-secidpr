import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/app/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.name || !body?.base_image_url) {
      return NextResponse.json({ error: 'name and base_image_url are required.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const ref = db.collection('mannequin_2d').doc();

    const payload = {
      mannequin_id: ref.id,
      name: String(body.name),
      gender: String(body.gender ?? 'female'),
      body_type: String(body.body_type ?? 'balanced'),
      pose_code: String(body.pose_code ?? 'pose_a'),
      canvas_width: Number(body.canvas_width ?? 1200),
      canvas_height: Number(body.canvas_height ?? 1800),
      preview_width: Number(body.preview_width ?? 560),
      preview_height: Number(body.preview_height ?? 840),
      base_image_url: String(body.base_image_url),
      shadow_image_url: body.shadow_image_url ? String(body.shadow_image_url) : '',
      hair_back_url: body.hair_back_url ? String(body.hair_back_url) : '',
      hair_front_url: body.hair_front_url ? String(body.hair_front_url) : '',
      face_layer_url: body.face_layer_url ? String(body.face_layer_url) : '',
      active: true,
      created_at: now,
      updated_at: now,
    };

    await ref.set(payload);
    return NextResponse.json(payload, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create mannequin.' }, { status: 500 });
  }
}
