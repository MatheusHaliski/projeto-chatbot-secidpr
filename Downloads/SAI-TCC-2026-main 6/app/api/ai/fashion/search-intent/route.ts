import { NextRequest, NextResponse } from 'next/server';
import { googleFashionAI } from '@/app/lib/ai/googleFashionAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.query) {
      return NextResponse.json(
        { ok: false, provider: 'google', failedStage: 'search_intent', message: 'Missing query', fallbackUsed: false },
        { status: 400 }
      );
    }

    const result = await googleFashionAI.parseSearchIntent({
      query: body.query,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/ai/fashion/search-intent] Error:', error);
    return NextResponse.json(
      { ok: false, provider: 'google', failedStage: 'search_intent', message: error.message || 'Unknown error', fallbackUsed: true },
      { status: 500 }
    );
  }
}
