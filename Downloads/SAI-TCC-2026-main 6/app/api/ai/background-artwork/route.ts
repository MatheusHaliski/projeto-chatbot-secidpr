import { NextRequest, NextResponse } from 'next/server';
import { BackgroundGenerationMode, buildBackgroundGenerationPlan, generateBackgroundVariations } from '@/app/lib/background-ai';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      rawPrompt?: string;
      palette?: string;
      style?: string;
      mood?: string;
      generationMode?: BackgroundGenerationMode;
      metadata?: {
        style?: string;
        occasion?: string;
        visibility?: string;
        title?: string;
        brandIdentity?: string;
        wearstyles?: string[];
        mood?: string;
        palette?: string;
        brands?: string[];
      };
    };

    const rawPrompt = body.rawPrompt?.trim() || body.prompt?.trim() || 'luxury editorial abstract background';
    const plan = buildBackgroundGenerationPlan({
      prompt: rawPrompt,
      style: body.style,
      mood: body.mood,
      palette: body.palette,
      generationMode: body.generationMode,
      metadata: body.metadata,
    });

    const variations = generateBackgroundVariations(plan, rawPrompt, 4);
    console.debug('background_generation_plan', plan);

    return NextResponse.json({
      images: variations.map((variation) => variation.image),
      gradients: variations.map((variation) => variation.gradient),
      generationPlan: plan,
      promptUsed: rawPrompt,
    });
  } catch {
    return NextResponse.json({ error: 'Unable to generate artwork.' }, { status: 500 });
  }
}
