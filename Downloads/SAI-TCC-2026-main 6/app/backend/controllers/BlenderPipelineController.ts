import { BlenderPipelineService } from '@/app/backend/services/BlenderPipelineService';

export class BlenderPipelineController {
  constructor(private readonly blenderPipelineService = new BlenderPipelineService()) {}

  async createUvJob(input: Record<string, unknown>) {
    return this.blenderPipelineService.createUvJob(input);
  }

  async getJob(jobId: string) {
    return this.blenderPipelineService.getJob(jobId);
  }
}
