import { NextRequest, NextResponse } from 'next/server';
import { googleFashionAI } from '@/app/lib/ai/googleFashionAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.pieces || body.pieces.length === 0) {
      return NextResponse.json(
        { ok: false, provider: 'google', failedStage: 'generate_card_description', message: 'Missing pieces array', fallbackUsed: false },
        { status: 400 }
      );
    }

    const result = await googleFashionAI.generateCardOutfitDescription({
      pieces: body.pieces,
      overallColors: body.overallColors || [],
      dominantStyle: body.dominantStyle || 'Casual',
      season: body.season || 'all-season',
      userIntent: body.userIntent,
      occasion: body.occasion,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/ai/fashion/generate-card-description] Error:', error);
    return NextResponse.json(
      { ok: false, provider: 'google', failedStage: 'generate_card_description', message: error.message || 'Unknown error', fallbackUsed: true },
      { status: 500 }
    );
  }
}
