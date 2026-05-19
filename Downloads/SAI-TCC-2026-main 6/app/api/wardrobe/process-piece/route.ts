import { NextResponse } from 'next/server';
import { WardrobeImagePreparationService, WardrobePreparationError } from '@/app/lib/fashion-ai/services/WardrobeImagePreparationService';

const preparationService = new WardrobeImagePreparationService();

export async function POST(request: Request) {
  console.info('[process-piece] request received');
  let pieceId = '';

  try {
    console.info('[process-piece] validating body');
    const body = (await request.json().catch(() => ({}))) as { pieceId?: string };
    pieceId = String(body.pieceId ?? '').trim();

    if (!pieceId) {
      return NextResponse.json({ ok: false, error: 'INVALID_INPUT', pieceId }, { status: 400 });
    }

    const { fitProfile, debug } = await preparationService.preparePieceForTester2D(pieceId);

    const response = {
      ok: true,
      pieceId,
      wardrobeItemFound: debug.wardrobeItemFound,
      imageUrlFound: debug.imageUrlFound,
      inferredPieceType: debug.inferredPieceType,
      inferredTargetGender: debug.inferredTargetGender,
      previousFitProfileStatus: debug.previousFitProfileStatus,
      newPreparationStatus: debug.newPreparationStatus,
      compatibleMannequins: debug.compatibleMannequins,
      warnings: debug.warnings,
      fitProfile,
    };

    console.info('[process-piece] success', {
      pieceId,
      newPreparationStatus: debug.newPreparationStatus,
      inferredPieceType: debug.inferredPieceType,
      inferredTargetGender: debug.inferredTargetGender,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof WardrobePreparationError) {
      console.error('[process-piece] failed', { code: error.code, status: error.status, message: error.message });
      return NextResponse.json(
        {
          ok: false,
          error: error.code,
          pieceId,
        },
        { status: error.status },
      );
    }

    console.error('[process-piece] failed', { message: error instanceof Error ? error.message : 'unknown_error' });
    return NextResponse.json({ ok: false, error: 'UNEXPECTED_PROCESSING_ERROR', pieceId }, { status: 500 });
  }
}
