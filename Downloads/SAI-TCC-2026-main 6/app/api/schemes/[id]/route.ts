import { SchemesController } from '@/app/backend/controllers/SchemesController';
import { NextResponse } from 'next/server';

const schemesController = new SchemesController();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await schemesController.getById(String(id));
  if (!data) {
    return NextResponse.json({ error: 'Scheme not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
