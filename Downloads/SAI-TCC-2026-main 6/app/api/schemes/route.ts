import { SchemesController } from '@/app/backend/controllers/SchemesController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/app/lib/serverSession';

const schemesController = new SchemesController();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const session = readSession(request);
    const sessionUserId = session?.sub?.trim() ?? '';
    const requestUserId = body.user_id ? String(body.user_id).trim() : '';
    const resolvedUserId = sessionUserId || requestUserId;

    if (!resolvedUserId || !body.title || !body.style || !body.occasion || !body.visibility) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Select at least one wardrobe item before saving.' }, { status: 400 });
    }

    const normalized = {
      ...body,
      user_id: resolvedUserId,
      pieces: Array.isArray(body.pieces)
        ? body.pieces.map((piece: Record<string, unknown>) => ({
            ...piece,
            id: String(piece.id),
            sourceId: String(piece.sourceId),
            name: String(piece.name),
            brand: String(piece.brand),
            pieceType: String(piece.pieceType),
            wearstyles: Array.isArray(piece.wearstyles)
              ? piece.wearstyles.map((wearstyle) => String(wearstyle))
              : [],
          }))
        : [],
      items: Array.isArray(body.items)
        ? body.items.map((item: Record<string, unknown>) => ({
            ...item,
            wardrobe_item_id: String(item.wardrobe_item_id),
          }))
        : [],
    };

    const data = await schemesController.create(normalized);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
