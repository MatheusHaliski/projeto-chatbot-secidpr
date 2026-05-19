import { NextResponse } from 'next/server';
import { MannequinRepository } from '@/app/lib/fashion-ai/repositories/MannequinRepository';

const mannequinRepository = new MannequinRepository();

export async function GET() {
  const mannequins = await mannequinRepository.list();
  return NextResponse.json({ mannequins });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { seed?: boolean };
  if (body.seed) {
    await mannequinRepository.seedDefaults();
    return NextResponse.json({ ok: true, seeded: true });
  }
  return NextResponse.json({ ok: false, error: 'Unsupported operation' }, { status: 400 });
}
