import { ArtworkStudioService } from '@/app/backend/services/ArtworkStudioService';
import { ServiceError } from '@/app/backend/services/errors';
import { GenerateArtworkRequest, GenerateArtworkResponse } from '@/app/backend/types/artwork-studio';
import { NextRequest, NextResponse } from 'next/server';

const service = new ArtworkStudioService();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateArtworkRequest;
    const data = await service.generate(body);
    const response: GenerateArtworkResponse = { success: true, data };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate artwork.';
    if (error instanceof ServiceError) {
      const response: GenerateArtworkResponse = { success: false, error: message };
      return NextResponse.json(response, { status: error.statusCode });
    }

    console.error('api.artwork-studio.generate', error);
    const response: GenerateArtworkResponse = { success: false, error: message };
    return NextResponse.json(response, { status: 500 });
  }
}
