import { BlenderPipelineController } from '@/app/backend/controllers/BlenderPipelineController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextResponse } from 'next/server';

const blenderPipelineController = new BlenderPipelineController();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await blenderPipelineController.createUvJob(body);
    return NextResponse.json(created, { status: 202 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
