import { PieceItemsController } from '@/app/backend/controllers/PieceItemsController';
import { NextResponse } from 'next/server';

const pieceItemsController = new PieceItemsController();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const data = await pieceItemsController.search({
    season: searchParams.get('season') ?? undefined,
    gender: searchParams.get('gender') ?? undefined,
    brand: searchParams.get('brand') ?? undefined,
    piece_type: searchParams.get('piece_type') ?? undefined,
  });

  return NextResponse.json(data);
}
