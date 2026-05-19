import { NextRequest, NextResponse } from 'next/server';
import { googleFashionAI } from '@/app/lib/ai/googleFashionAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.userPrompt) {
      return NextResponse.json(
        { ok: false, provider: 'google', failedStage: 'background_studio', message: 'Missing userPrompt', fallbackUsed: false },
        { status: 400 }
      );
    }

    const result = await googleFashionAI.generateBackgroundPrompt({
      userPrompt: body.userPrompt,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/ai/fashion/background-studio] Error:', error);
    return NextResponse.json(
      { ok: false, provider: 'google', failedStage: 'background_studio', message: error.message || 'Unknown error', fallbackUsed: true },
      { status: 500 }
    );
  }
}
