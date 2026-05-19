import { BlenderPipelineController } from '@/app/backend/controllers/BlenderPipelineController';
import { ServiceError } from '@/app/backend/services/errors';
import { NextResponse } from 'next/server';

const blenderPipelineController = new BlenderPipelineController();

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;
    const job = await blenderPipelineController.getJob(jobId);
    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
