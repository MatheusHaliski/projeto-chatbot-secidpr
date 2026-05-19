import { BrandsController } from '@/app/backend/controllers/BrandsController';
import { NextResponse } from 'next/server';

const brandsController = new BrandsController();

export async function GET(_: Request, { params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const catalog = await brandsController.logoCatalogByBrandId(String(brandId));
  if (!catalog) {
    return NextResponse.json({ error: 'Active logo catalog not found for this brand.' }, { status: 404 });
  }
  return NextResponse.json(catalog);
}
