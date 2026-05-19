import { WardrobeController } from '@/app/backend/controllers/WardrobeController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextResponse } from 'next/server';

const wardrobeController = new WardrobeController();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await wardrobeController.listDiscoverable({
      brand_id: searchParams.get('brand_id') ?? undefined,
      market_id: searchParams.get('market_id') ?? undefined,
      gender: searchParams.get('gender') ?? undefined,
      cursorCreatedAt: searchParams.get('cursor') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 24),
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await wardrobeController.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
