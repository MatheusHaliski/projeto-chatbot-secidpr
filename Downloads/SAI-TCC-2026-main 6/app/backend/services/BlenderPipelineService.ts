import { PipelineJobsRepository } from '@/app/backend/repositories/PipelineJobsRepository';
import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';
import { BlenderCloudService } from './BlenderCloudService';
import { ServiceError } from './errors';

function findUrlInArtifacts(artifacts: Record<string, unknown> | null): string | null {
  if (!artifacts) return null;

  const candidates = [
    artifacts.model_3d_url,
    artifacts.modelUrl,
    artifacts.outputModelUrl,
    artifacts.outputUrl,
    artifacts.glbUrl,
    artifacts.artifact_url,
    artifacts.artifactUrl,
    artifacts.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function findCleanedPngUrlInArtifacts(artifacts: Record<string, unknown> | null): string | null {
  if (!artifacts) return null;
  const candidates = [
    artifacts.cleaned_png_url,
    artifacts.cleanedPngUrl,
    artifacts.cleaned_image_url,
    artifacts.cleanedImageUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export class BlenderPipelineService {
  constructor(
    private readonly pipelineJobsRepository = new PipelineJobsRepository(),
    private readonly wardrobeItemsRepository = new WardrobeItemsRepository(),
    private readonly blenderCloudService = new BlenderCloudService(),
  ) {}

  async createUvJob(input: Record<string, unknown>) {
    const user_id = String(input.user_id ?? '').trim();
    const wardrobe_item_id = String(input.wardrobe_item_id ?? '').trim();
    const requestedModelUrl = String(input.modelUrl ?? '').trim();
    const generation_mode = String(input.generation_mode ?? 'fast_uv').trim() === 'hq_uv' ? 'hq_uv' : 'fast_uv';

    if (!user_id || !wardrobe_item_id) {
      throw new ServiceError('Missing required fields for UV generation job (user_id, wardrobe_item_id).', 400);
    }

    const wardrobeItem = await this.wardrobeItemsRepository.findById(wardrobe_item_id);
    if (!wardrobeItem) {
      throw new ServiceError('Wardrobe item not found for UV generation.', 404);
    }

    const modelUrlCandidates = [
      requestedModelUrl,
      typeof wardrobeItem.model_3d_url === 'string' ? wardrobeItem.model_3d_url : '',
      typeof wardrobeItem.model_branded_3d_url === 'string' ? wardrobeItem.model_branded_3d_url : '',
      typeof wardrobeItem.model_base_3d_url === 'string' ? wardrobeItem.model_base_3d_url : '',
    ];

    const modelUrl = modelUrlCandidates.find((url) => url.trim().length > 0)?.trim() ?? '';

    if (!modelUrl) {
      throw new ServiceError('Model URL not available yet for UV generation. Wait until 3D model generation is done.', 409);
    }

    const created = await this.pipelineJobsRepository.create({
      user_id,
      wardrobe_item_id,
      provider: 'runpod',
      cloud_job_id: null,
      status: 'queued',
      stage: 'queued',
      input_payload: {
        modelUrl,
        jobType: 'uv_unwrap',
        options: {
          generation_mode,
        },
      },
      artifacts: null,
      metrics: null,
      error_message: null,
      started_at: null,
      finished_at: null,
    });

    try {
      const runpodSubmitted = await this.blenderCloudService.submitBlenderCloudJob({
        modelUrl,
        jobType: 'uv_unwrap',
        options: { generation_mode },
      });

      const submittedStatus = runpodSubmitted.status === 'completed'
        ? 'completed'
        : runpodSubmitted.status === 'failed' || runpodSubmitted.status === 'cancelled'
          ? runpodSubmitted.status
          : 'submitted';

      await this.pipelineJobsRepository.update(created.pipeline_job_id, {
        cloud_job_id: runpodSubmitted.cloudJobId,
        status: submittedStatus,
        stage: submittedStatus === 'completed' ? 'completed' : 'submitted_to_runpod',
        started_at: new Date().toISOString(),
        metrics: {
          runpodSubmitResponse: runpodSubmitted.raw,
        },
        artifacts: runpodSubmitted.artifacts,
        finished_at: submittedStatus === 'completed' ? new Date().toISOString() : null,
      });

      if (submittedStatus === 'completed') {
        const artifactUrl = findUrlInArtifacts(runpodSubmitted.artifacts);
        const cleanedPngUrl = findCleanedPngUrlInArtifacts(runpodSubmitted.artifacts);
        await this.wardrobeItemsRepository.updatePipelineStatus(wardrobe_item_id, 'done', null, {
          stage: 'uv_pipeline_completed_inline',
          pipeline_job_id: created.pipeline_job_id,
          cloud_job_id: runpodSubmitted.cloudJobId,
          provider: 'runpod',
          uv_job_artifacts: runpodSubmitted.artifacts,
        });

        if (artifactUrl) {
          await this.wardrobeItemsRepository.updateModel3dUrl(wardrobe_item_id, artifactUrl);
        }
        if (cleanedPngUrl) {
          await this.wardrobeItemsRepository.updateCleanedPngUrl(wardrobe_item_id, cleanedPngUrl);
        }
      }

      return {
        jobId: created.pipeline_job_id,
        cloudJobId: runpodSubmitted.cloudJobId,
        provider: 'runpod',
        status: submittedStatus,
        stage: submittedStatus === 'completed' ? 'completed' : 'submitted_to_runpod',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to submit job to Blender Cloud service.';
      await this.pipelineJobsRepository.update(created.pipeline_job_id, {
        status: 'failed',
        stage: 'submit_failed',
        error_message: errorMessage,
        finished_at: new Date().toISOString(),
      });
      await this.wardrobeItemsRepository.updatePipelineStatus(wardrobe_item_id, 'failed', errorMessage, {
        stage: 'uv_pipeline_submit_failed',
        pipeline_job_id: created.pipeline_job_id,
      });
      throw new ServiceError(errorMessage, 502);
    }
  }

  async getJob(pipelineJobId: string) {
    const job = await this.syncBlenderCloudJob(pipelineJobId);
    return {
      jobId: job.pipeline_job_id,
      cloudJobId: job.cloud_job_id,
      provider: job.provider,
      status: job.status,
      stage: job.stage,
      artifacts: job.artifacts,
      metrics: job.metrics,
      error: job.error_message,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      updatedAt: job.updated_at,
    };
  }

  async syncBlenderCloudJob(pipelineJobId: string) {
    const job = await this.pipelineJobsRepository.findById(pipelineJobId);
    if (!job) {
      throw new ServiceError('Pipeline job not found.', 404);
    }

    if (!job.cloud_job_id) {
      if (job.status !== 'failed' && job.status !== 'cancelled') {
        await this.pipelineJobsRepository.update(pipelineJobId, {
          status: 'failed',
          stage: 'missing_cloud_job_id',
          error_message: 'Pipeline job is missing cloud_job_id.',
          finished_at: new Date().toISOString(),
        });
      }
      return (await this.pipelineJobsRepository.findById(pipelineJobId)) ?? job;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return job;
    }

    const remote = await this.blenderCloudService.getBlenderCloudJobStatus(job.cloud_job_id, job.metrics?.runpodSubmitResponse as Record<string, unknown> | undefined);
    const cleanedPngUrl = findCleanedPngUrlInArtifacts(remote.artifacts);
    const mergedMetrics = {
      ...(job.metrics ?? {}),
      ...(remote.metrics ?? {}),
      last_remote_status: remote.status,
      last_synced_at: new Date().toISOString(),
    };

    if (remote.status === 'completed') {
      const resolvedModelUrl = findUrlInArtifacts(remote.artifacts);

      await this.pipelineJobsRepository.update(pipelineJobId, {
        status: 'completed',
        stage: 'completed',
        artifacts: remote.artifacts,
        metrics: mergedMetrics,
        error_message: null,
        finished_at: new Date().toISOString(),
      });

      await this.wardrobeItemsRepository.updatePipelineStatus(job.wardrobe_item_id, 'done', null, {
        stage: 'uv_pipeline_completed',
        pipeline_job_id: pipelineJobId,
        cloud_job_id: job.cloud_job_id,
        provider: 'runpod',
        uv_job_artifacts: remote.artifacts,
        uv_job_metrics: remote.metrics,
      });

      if (resolvedModelUrl) {
        await this.wardrobeItemsRepository.updateModel3dUrl(job.wardrobe_item_id, resolvedModelUrl);
      }
      if (cleanedPngUrl) {
        await this.wardrobeItemsRepository.updateCleanedPngUrl(job.wardrobe_item_id, cleanedPngUrl);
      }
    } else if (remote.status === 'failed' || remote.status === 'cancelled') {
      const failureMessage = remote.errorMessage ?? (remote.status === 'cancelled' ? 'RunPod Blender job was cancelled.' : 'RunPod Blender job failed.');
      await this.pipelineJobsRepository.update(pipelineJobId, {
        status: remote.status,
        stage: remote.status,
        artifacts: remote.artifacts,
        metrics: mergedMetrics,
        error_message: failureMessage,
        finished_at: new Date().toISOString(),
      });

      await this.wardrobeItemsRepository.updatePipelineStatus(job.wardrobe_item_id, 'failed', failureMessage, {
        stage: remote.status === 'cancelled' ? 'uv_pipeline_cancelled' : 'uv_pipeline_failed',
        pipeline_job_id: pipelineJobId,
        cloud_job_id: job.cloud_job_id,
        provider: 'runpod',
      });
      if (cleanedPngUrl) {
        await this.wardrobeItemsRepository.updateCleanedPngUrl(job.wardrobe_item_id, cleanedPngUrl);
      }
    } else {
      await this.pipelineJobsRepository.update(pipelineJobId, {
        status: remote.status === 'submitted' ? 'submitted' : remote.status === 'in_progress' ? 'in_progress' : 'queued',
        stage: remote.status,
        metrics: mergedMetrics,
      });
    }

    const synced = await this.pipelineJobsRepository.findById(pipelineJobId);
    if (!synced) {
      throw new ServiceError('Pipeline job not found after synchronization.', 404);
    }

    return synced;
  }
}
