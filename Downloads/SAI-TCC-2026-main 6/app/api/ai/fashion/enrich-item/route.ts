import { NextRequest, NextResponse } from 'next/server';
import { googleFashionAI } from '@/app/lib/ai/googleFashionAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.imageUrl && !body.base64Image) {
      return NextResponse.json(
        { ok: false, provider: 'google', failedStage: 'enrich_item', message: 'Missing image for enrichment', fallbackUsed: false },
        { status: 400 }
      );
    }

    // For now, enrich-item acts similarly to analyze-piece but could be expanded to use text only
    const result = await googleFashionAI.analyzeFashionImage({
      base64Image: body.base64Image,
      imageUrl: body.imageUrl,
      mimeType: body.mimeType,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/ai/fashion/enrich-item] Error:', error);
    return NextResponse.json(
      { ok: false, provider: 'google', failedStage: 'enrich_item', message: error.message || 'Unknown error', fallbackUsed: true },
      { status: 500 }
    );
  }
}
