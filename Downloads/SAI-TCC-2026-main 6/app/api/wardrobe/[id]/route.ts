import { WardrobeController } from '@/app/backend/controllers/WardrobeController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextResponse } from 'next/server';

const wardrobeController = new WardrobeController();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await wardrobeController.getByIdWith2D(id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
