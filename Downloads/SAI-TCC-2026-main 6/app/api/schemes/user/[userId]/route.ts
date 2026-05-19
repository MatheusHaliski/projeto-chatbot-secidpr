import { SchemesController } from '@/app/backend/controllers/SchemesController';
import { NextResponse } from 'next/server';

const schemesController = new SchemesController();

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const data = await schemesController.listByUser(String(userId));
  return NextResponse.json(data);
}
