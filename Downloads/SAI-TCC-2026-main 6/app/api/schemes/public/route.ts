import { SchemesController } from '@/app/backend/controllers/SchemesController';
import { NextResponse } from 'next/server';

const schemesController = new SchemesController();

export async function GET() {
  const data = await schemesController.listPublic();
  return NextResponse.json(data);
}
