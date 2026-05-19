import { SchemeItemsController } from '@/app/backend/controllers/SchemeItemsController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextResponse } from 'next/server';

const schemeItemsController = new SchemeItemsController();

type SchemeItemSlot = 'upper' | 'lower' | 'shoes' | 'accessory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body.items;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
    }

    const validSlots: SchemeItemSlot[] = ['upper', 'lower', 'shoes', 'accessory'];

    const normalized = items.map((item: Record<string, unknown>, index: number) => {
      const slot = String(item.slot) as SchemeItemSlot;
      const sort_order =
        item.sort_order !== undefined ? Number(item.sort_order) : index;

      if (!validSlots.includes(slot)) {
        throw new ServiceError(
          `Invalid slot at index ${index}. Expected one of: ${validSlots.join(', ')}`,
          400
        );
      }

      if (Number.isNaN(sort_order)) {
        throw new ServiceError(`Invalid sort_order at index ${index}`, 400);
      }

      return {
        scheme_id: String(item.scheme_id),
        wardrobe_item_id: String(item.wardrobe_item_id),
        slot,
        sort_order,
      };
    });

    const data = await schemeItemsController.createMany(normalized);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
