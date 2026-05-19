import { WardrobeController } from '@/app/backend/controllers/WardrobeController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextResponse } from 'next/server';

const wardrobeController = new WardrobeController();

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const data = await wardrobeController.analysisByUser(String(userId));
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
