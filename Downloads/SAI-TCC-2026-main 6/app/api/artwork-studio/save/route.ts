import { ArtworkStudioService } from '@/app/backend/services/ArtworkStudioService';
import { ServiceError } from '@/app/backend/services/errors';
import { SaveArtworkRequest, SaveArtworkResponse } from '@/app/backend/types/artwork-studio';
import { NextRequest, NextResponse } from 'next/server';

const service = new ArtworkStudioService();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveArtworkRequest;

    if (!body?.user_id || !body?.variation || !body?.input) {
      return NextResponse.json<SaveArtworkResponse>({ success: false, error: 'user_id, input, and variation are required.' }, { status: 400 });
    }

    const asset = await service.saveSelection(body);
    return NextResponse.json<SaveArtworkResponse>({ success: true, asset }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json<SaveArtworkResponse>({ success: false, error: error.message }, { status: error.statusCode });
    }

    console.error('api.artwork-studio.save', error);
    return NextResponse.json<SaveArtworkResponse>({ success: false, error: 'Unable to save artwork asset.' }, { status: 500 });
  }
}
