import { NextRequest, NextResponse } from 'next/server';
import { googleFashionAI } from '@/app/lib/ai/googleFashionAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.base64Image && !body.imageUrl) {
      return NextResponse.json(
        { ok: false, provider: 'google', failedStage: 'analyze_piece', message: 'Missing base64Image or imageUrl', fallbackUsed: false },
        { status: 400 }
      );
    }

    const result = await googleFashionAI.analyzeFashionImage({
      base64Image: body.base64Image,
      imageUrl: body.imageUrl,
      mimeType: body.mimeType,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/ai/fashion/analyze-piece] Error:', error);
    return NextResponse.json(
      { ok: false, provider: 'google', failedStage: 'analyze_piece', message: error.message || 'Unknown error', fallbackUsed: true },
      { status: 500 }
    );
  }
}
