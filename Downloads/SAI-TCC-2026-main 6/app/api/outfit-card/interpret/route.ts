import { OutfitCardAiService } from '@/app/backend/services/OutfitCardAiService';
import { ServiceError } from '@/app/backend/services/errors';
import { OutfitInterpretResponse, OutfitInterpretationInput } from '@/app/backend/types/outfit-card-ai';
import { NextRequest, NextResponse } from 'next/server';

const service = new OutfitCardAiService();

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const body = (await request.json()) as OutfitInterpretationInput;
    const data = await service.interpret(body);
    const response: OutfitInterpretResponse = { success: true, data, request_id: requestId };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível interpretar o look.';

    if (error instanceof ServiceError) {
      const response: OutfitInterpretResponse = {
        success: false,
        error: message,
        error_code: `SERVICE_${error.statusCode}`,
        request_id: requestId,
      };
      return NextResponse.json(response, { status: error.statusCode });
    }

    console.error('api.outfit-card.interpret', { requestId, error });
    const response: OutfitInterpretResponse = {
      success: false,
      error: message,
      error_code: 'UNEXPECTED_ERROR',
      request_id: requestId,
    };
    return NextResponse.json(response, { status: 500 });
  }
}
