import { MarketsController } from '@/app/backend/controllers/MarketsController';
import { NextResponse } from 'next/server';

const marketsController = new MarketsController();

export async function GET() {
  return NextResponse.json(await marketsController.listAll());
}
