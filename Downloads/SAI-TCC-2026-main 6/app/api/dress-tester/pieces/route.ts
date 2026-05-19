import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/app/lib/firebaseAdmin';
import { DRESS_TESTER_CATEGORIES } from '@/app/lib/dress-tester-models';
import { runVirtualTryOn } from '@/app/lib/replicate-tryon';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pieceType = String(body?.piece_type ?? '');
    if (!body?.name || !body?.image_url || !DRESS_TESTER_CATEGORIES.includes(pieceType as (typeof DRESS_TESTER_CATEGORIES)[number])) {
      return NextResponse.json({ error: 'name, image_url and valid piece_type are required.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const ref = db.collection('wardrobe_piece_2d').doc();

    const payload = {
      piece_id: ref.id,
      name: String(body.name),
      brand_id: String(body.brand_id ?? 'brand_1'),
      brand: String(body.brand ?? body.brand_id ?? 'brand_1'),
      market_id: String(body.market_id ?? 'market_1'),
      piece_type: pieceType,
      category_tier: String(body.category_tier ?? 'premium'),
      mannequin_type: String(body.mannequin_type ?? 'female_editorial'),
      pose_code: String(body.pose_code ?? 'pose_a'),
      render_layer: Number(body.render_layer ?? 20),
      image_url: String(body.image_url),
      thumbnail_url: String(body.thumbnail_url ?? body.image_url),
      hide_layers: Array.isArray(body.hide_layers) ? body.hide_layers.map((item: unknown) => String(item)) : [],
      hides_piece_types: Array.isArray(body.hides_piece_types) ? body.hides_piece_types.map((item: unknown) => String(item)) : [],
      conflicts_with: Array.isArray(body.conflicts_with) ? body.conflicts_with.map((item: unknown) => String(item)) : [],
      compatible_piece_types: Array.isArray(body.compatible_piece_types) ? body.compatible_piece_types.map((item: unknown) => String(item)) : [],
      compatible_gender: Array.isArray(body.compatible_gender) ? body.compatible_gender.map((item: unknown) => String(item)) : [],
      anchor: body.anchor && typeof body.anchor === 'object'
        ? {
            x: Number((body.anchor as { x?: number }).x ?? 0),
            y: Number((body.anchor as { y?: number }).y ?? 0),
            scale: Number((body.anchor as { scale?: number }).scale ?? 1),
          }
        : { x: 0, y: 0, scale: 1 },
      scale_adjustment: Number(body.scale_adjustment ?? 1),
      wearstyles: Array.isArray(body.wearstyles) ? body.wearstyles.map((item: unknown) => String(item)) : [],
      colors: Array.isArray(body.colors) ? body.colors.map((item: unknown) => String(item)) : [],
      materials: Array.isArray(body.materials) ? body.materials.map((item: unknown) => String(item)) : [],
      season: String(body.season ?? 'all'),
      gender: String(body.gender ?? 'female'),
      render_image_url: null as string | null,
      asset_status: 'asset_pending',
      active: true,
      created_at: now,
      updated_at: now,
    };

    await ref.set(payload);

    // Fire-and-forget: generate try-on image via Replicate
    void generateAndSaveRenderImage(db, ref.id, payload.image_url);

    return NextResponse.json(payload, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create wardrobe piece.' }, { status: 500 });
  }
}

async function generateAndSaveRenderImage(
  db: FirebaseFirestore.Firestore,
  pieceId: string,
  garmentUrl: string,
) {
  try {
    // Fetch the first active mannequin to use as the base model image
    const mannequinSnap = await db.collection('mannequin_2d').where('active', '==', true).limit(1).get();
    const mannequinData = mannequinSnap.docs[0]?.data() as { base_image_url?: string } | undefined;
    const modelImageUrl = mannequinData?.base_image_url ?? '';

    if (!modelImageUrl) {
      console.warn('[dress-tester/pieces] no active mannequin found, skipping Replicate generation for piece', pieceId);
      await db.collection('wardrobe_piece_2d').doc(pieceId).update({
        asset_status: 'asset_review',
        updated_at: new Date().toISOString(),
      });
      return;
    }

    const renderUrl = await runVirtualTryOn({ garmentImageUrl: garmentUrl, modelImageUrl });

    await db.collection('wardrobe_piece_2d').doc(pieceId).update({
      render_image_url: renderUrl ?? null,
      asset_status: renderUrl ? 'ready_for_tester' : 'asset_review',
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[dress-tester/pieces] Replicate generation failed for piece', pieceId, error);
    await db.collection('wardrobe_piece_2d').doc(pieceId).update({
      asset_status: 'asset_review',
      updated_at: new Date().toISOString(),
    }).catch(() => undefined);
  }
}
