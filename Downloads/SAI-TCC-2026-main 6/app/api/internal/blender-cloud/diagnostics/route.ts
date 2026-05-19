import { BlenderCloudService } from '@/app/backend/services/BlenderCloudService';
import { NextRequest, NextResponse } from 'next/server';

const blenderCloudService = new BlenderCloudService();

export async function GET(request: NextRequest) {
  const expectedToken = process.env.BLENDER_CLOUD_DEBUG_TOKEN?.trim();
  const providedToken = request.headers.get('x-blender-debug-token')?.trim();

  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const diagnostics = await blenderCloudService.getDiagnostics();
    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to inspect Blender Cloud diagnostics.' },
      { status: 500 },
    );
  }
}
