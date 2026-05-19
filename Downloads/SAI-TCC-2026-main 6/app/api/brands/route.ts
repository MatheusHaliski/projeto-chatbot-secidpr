import { BrandsController } from '@/app/backend/controllers/BrandsController';
import { NextResponse } from 'next/server';

const brandsController = new BrandsController();

export async function GET() {
  return NextResponse.json(await brandsController.listActive());
}
