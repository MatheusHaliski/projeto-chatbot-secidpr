import { NextRequest, NextResponse } from 'next/server';
import { googleFashionAI } from '@/app/lib/ai/googleFashionAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.pieceName || !body.category || !body.bodyRegion) {
      return NextResponse.json(
        { ok: false, provider: 'google', failedStage: 'tester_fit', message: 'Missing required piece fields', fallbackUsed: false },
        { status: 400 }
      );
    }

    const result = await googleFashionAI.generateTester2DFitInstructions({
      pieceName: body.pieceName,
      category: body.category,
      bodyRegion: body.bodyRegion,
      imageSpecs: body.imageSpecs,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/ai/fashion/tester-fit] Error:', error);
    return NextResponse.json(
      { ok: false, provider: 'google', failedStage: 'tester_fit', message: error.message || 'Unknown error', fallbackUsed: true },
      { status: 500 }
    );
  }
}
