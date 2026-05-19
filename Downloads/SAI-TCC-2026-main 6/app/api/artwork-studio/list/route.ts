import { ArtworkStudioService } from '@/app/backend/services/ArtworkStudioService';
import { ServiceError } from '@/app/backend/services/errors';
import { ListArtworkResponse } from '@/app/backend/types/artwork-studio';
import { NextRequest, NextResponse } from 'next/server';

const service = new ArtworkStudioService();

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id')?.trim() ?? '';
    if (!userId) {
      return NextResponse.json<ListArtworkResponse>({ success: false, assets: [], error: 'user_id query param is required.' }, { status: 400 });
    }

    const assets = await service.listByUser(userId);
    return NextResponse.json<ListArtworkResponse>({ success: true, assets });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json<ListArtworkResponse>({ success: false, assets: [], error: error.message }, { status: error.statusCode });
    }

    console.error('api.artwork-studio.list', error);
    return NextResponse.json<ListArtworkResponse>({ success: false, assets: [], error: 'Unable to list artwork assets.' }, { status: 500 });
  }
}
