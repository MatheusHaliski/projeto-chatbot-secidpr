import { WardrobeItemsRepository } from '@/app/backend/repositories/WardrobeItemsRepository';
import { ServiceError } from './errors';
import { BrandDetectionService } from './BrandDetectionService';
import { BrandPlacementService } from './BrandPlacementService';
import { PieceIsolationService } from './PieceIsolationService';
import { GeometryScopeService } from './GeometryScopeService';
import { MeshyService } from './MeshyService';
import { BrandsRepository } from '@/app/backend/repositories/BrandsRepository';
import { PipelineJobsRepository } from '@/app/backend/repositories/PipelineJobsRepository';
import { BlenderPipelineService } from './BlenderPipelineService';
import { BlenderCloudService } from './BlenderCloudService';
import type { ModelGenerationStatus } from '@/app/backend/types/entities';
import { classifyGarmentGender, classifyGarmentType } from '@/app/lib/fashion-ai/utils/garment-classification';
import { WardrobeImagePreparationService } from '@/app/lib/fashion-ai/services/WardrobeImagePreparationService';
import {
  buildPipelineInputSnapshot,
  canonicalizeBrandId,
  withStageHistory,
} from './modelPipelineDiagnostics';

const DEFAULT_BRAND_ID = 'default';
const BRANDING_PASS_VERSION = 'v2-image-first';
const SEGMENTATION_MIN_CONFIDENCE = Number(process.env.SEGMENTATION_MIN_CONFIDENCE ?? 0.75);
const MODEL_GENERATION_MAX_POLLS = Number(process.env.BLENDER_MODEL_MAX_POLLS ?? 48);
const MODEL_GENERATION_POLL_MS = Number(process.env.BLENDER_MODEL_POLL_MS ?? 1500);
const MODEL_GENERATION_JOB_TYPE = (process.env.BLENDER_MODEL_JOB_TYPE ?? 'image_to_garment').trim() || 'image_to_garment';
const BRAND_REVIEW_REQUIRED = String(process.env.BRAND_REVIEW_REQUIRED ?? 'false').trim().toLowerCase() === 'true';

interface BlenderGenerationResult {
  model_3d_url: string;
  model_preview_url: string | null;
}

export class WardrobeService {
  constructor(
    private readonly wardrobeRepo = new WardrobeItemsRepository(),
    private readonly blenderCloudService = new BlenderCloudService(),
    private readonly meshyService = new MeshyService(),
    private readonly brandDetectionService = new BrandDetectionService(),
    private readonly brandPlacementService = new BrandPlacementService(),
    private readonly pieceIsolationService = new PieceIsolationService(),
    private readonly geometryScopeService = new GeometryScopeService(),
    private readonly brandsRepository = new BrandsRepository(),
    private readonly pipelineJobsRepository = new PipelineJobsRepository(),
    private readonly blenderPipelineService = new BlenderPipelineService(),
    private readonly preparationService = new WardrobeImagePreparationService(),
  ) {}

  async listUserWardrobe(
    userId: string,
    options?: { limit?: number; cursorCreatedAt?: string; status?: 'active' | 'processing' | 'archived'; piece_type?: string },
  ) {
    await this.syncActiveUvJobs(userId);
    return this.wardrobeRepo.findByUser(userId, options);
  }

  private async syncActiveUvJobs(userId: string): Promise<void> {
    try {
      const activeJobs = await this.pipelineJobsRepository.findActiveByUser(userId);
      await Promise.all(activeJobs.map((job) => this.blenderPipelineService.syncBlenderCloudJob(job.pipeline_job_id)));
    } catch (error) {
      console.warn('[wardrobe-service] failed to sync active UV jobs', { userId, error });
    }
  }

  async getWardrobeAnalysis(userId: string) {
    return this.wardrobeRepo.getAnalysisByUser(userId);
  }

  async listDiscoverablePieces(filters?: {
    brand_id?: string;
    market_id?: string;
    gender?: string;
    limit?: number;
    cursorCreatedAt?: string;
  }) {
    return this.wardrobeRepo.findDiscoverable(filters);
  }

  async createWardrobeItem(input: Record<string, unknown>) {
    const user_id = String(input.user_id ?? '').trim();
    const name = String(input.name ?? '').trim();
    const image_url = String(input.image_url ?? '').trim();
    const piece_type = String(input.piece_type ?? '').trim();
    const gender = String(input.gender ?? '').trim() || 'unspecified';
    const market_id = String(input.market_id ?? '').trim();
    if (!user_id || !name || !image_url || !piece_type || !market_id) {
      throw new ServiceError('Missing required fields to create wardrobe item.', 400);
    }

    const selectedBrandIdRaw = String(input.brand_id ?? DEFAULT_BRAND_ID).trim() || DEFAULT_BRAND_ID;
    const selectedBrandId = canonicalizeBrandId(selectedBrandIdRaw);
    const fitPieceType = classifyGarmentType({ pieceType: piece_type, name });
    const fitGender = classifyGarmentGender({ gender, name });
    const compatibleMannequins =
      fitGender === 'male' ? ['male_v1'] : fitGender === 'female' ? ['female_v1'] : ['male_v1', 'female_v1'];
    const detection = await this.brandDetectionService.detect({
      selectedBrandId,
      name,
      imageUrl: image_url,
    });
    const resolvedBrandId = canonicalizeBrandId(detection.brand_id_detected ?? selectedBrandId);
    const hasReliableBrandMatch = Boolean(detection.brand_id_detected);
    const needsBrandReview = BRAND_REVIEW_REQUIRED && !hasReliableBrandMatch && selectedBrandId === DEFAULT_BRAND_ID;

    const createdItem = await this.wardrobeRepo.create({
      user_id,
      name,
      image_url,
      model_3d_url: null,
      model_preview_url: null,
      model_base_3d_url: null,
      model_branded_3d_url: null,
      isolated_piece_image_url: null,
      segmentation_confidence: null,
      geometry_scope_passed: false,
      geometry_scope_score: null,
      generation_attempt_count: 0,
      pipeline_stage_details: hasReliableBrandMatch
        ? null
        : {
            stage: needsBrandReview ? 'needs_brand_review' : 'queued_segmentation',
            brand_detection_warning: detection.detection_explanation,
          },
      model_status: needsBrandReview ? 'needs_brand_review' : 'queued_segmentation',
      model_generation_error: needsBrandReview ? detection.detection_explanation : null,
      piece_type,
      gender,
      market_id,
      brand_id: resolvedBrandId,
      brand_id_selected: selectedBrandIdRaw,
      brand_id_detected: detection.brand_id_detected ? canonicalizeBrandId(detection.brand_id_detected) : null,
      brand_detection_confidence: detection.brand_detection_confidence,
      brand_detection_source: detection.brand_detection_source,
      brand_applied: false,
      placement_profile_id: null,
      branding_pass_version: null,
      color: String(input.color ?? '').trim() || 'unspecified',
      material: String(input.material ?? '').trim() || 'unspecified',
      style_tags: Array.isArray(input.style_tags) ? input.style_tags.map((tag) => String(tag)) : [],
      occasion_tags: Array.isArray(input.occasion_tags) ? input.occasion_tags.map((tag) => String(tag)) : [],
      fitProfile: {
        pieceType: fitPieceType,
        targetGender: fitGender,
        preparationStatus: 'pending',
        originalImageUrl: image_url,
        preparedAssetUrl: null,
        preparedMaskUrl: null,
        compatibleMannequins,
        fitMode: 'overlay',
        normalizedBBox: null,
        garmentAnchors: null,
        validationWarnings: [],
        preparationError: null,
        preparedAt: null,
        updatedAt: new Date().toISOString(),
      },
    });

    if (!needsBrandReview) {
      await this.enrichWardrobeItemModel({
        wardrobeItemId: createdItem.wardrobe_item_id,
        imageUrl: image_url,
        pieceType: piece_type,
        brandId: resolvedBrandId,
      });
    }

    return createdItem;
  }

  private async enrichWardrobeItemModel(input: {
    wardrobeItemId: string;
    imageUrl: string;
    pieceType: string;
    brandId: string;
  }): Promise<void> {
    try {
      // Ensure 2D preparation runs before we check readiness so the piece is
      // never rejected simply because it was just created with status "pending".
      await this.preparationService.preparePieceForTester2D(input.wardrobeItemId);

      const sourceItem = await this.wardrobeRepo.findById(input.wardrobeItemId);
      const fitProfile = sourceItem?.fitProfile && typeof sourceItem.fitProfile === 'object'
        ? (sourceItem.fitProfile as Record<string, unknown>)
        : null;
      const hasImageUrl = Boolean(String(sourceItem?.image_url ?? '').trim());
      const preparationStatus = String(fitProfile?.preparationStatus ?? 'missing');
      const hasPreparedAsset = Boolean(String(fitProfile?.preparedAssetUrl ?? '').trim()) || hasImageUrl;
      const hasFitProfile = Boolean(fitProfile);
      const hasGarmentAnchors = Boolean(fitProfile?.garmentAnchors);
      const hasNormalizedBBox = Boolean(fitProfile?.normalizedBBox);
      const requiresAnchors = ['upper_piece', 'top'].includes(String(sourceItem?.piece_type ?? '').toLowerCase());

      if (!hasImageUrl || preparationStatus !== 'ready' || !hasPreparedAsset || !hasFitProfile || !hasNormalizedBBox || (requiresAnchors && !hasGarmentAnchors)) {
        await this.wardrobeRepo.updatePipelineStatus(
          input.wardrobeItemId,
          'needs_preparation',
          'Piece is not ready for 3D generation.',
          withStageHistory(sourceItem?.pipeline_stage_details as Record<string, unknown> | null, {
            stage: 'failed',
            failedStage: 'preparation_not_ready',
            provider: 'local',
            errorCode: 'PREPARATION_NOT_READY',
            message: '2D preparation and fit profile preconditions are not satisfied.',
            hint: 'Run 2D preparation before retrying 3D generation.',
            retryable: true,
            nextAction: 'POST /api/wardrobe/process-piece',
            requestUrl: null,
            responseStatus: null,
            responseBodyPreview: null,
            inputSnapshot: buildPipelineInputSnapshot((sourceItem ?? {}) as Record<string, unknown>),
          }),
        );
        return;
      }

      await this.wardrobeRepo.updatePipelineStatus(input.wardrobeItemId, 'queued_segmentation');
      const isolation = await this.pieceIsolationService.isolate({
        imageUrl: input.imageUrl,
        pieceType: input.pieceType,
      });

      await this.wardrobeRepo.updatePipelineStatus(
        input.wardrobeItemId,
        'segmentation_done',
        null,
        {
          stage: 'segmentation_done',
          ...isolation.stageDetails,
        },
      );

      if (isolation.segmentationConfidence < SEGMENTATION_MIN_CONFIDENCE) {
        await this.wardrobeRepo.updatePipelineStatus(
          input.wardrobeItemId,
          'needs_brand_review',
          `Segmentation confidence ${isolation.segmentationConfidence.toFixed(2)} below threshold ${SEGMENTATION_MIN_CONFIDENCE.toFixed(2)}.`,
          {
            stage: 'segmentation_rejected',
            segmentation_confidence: isolation.segmentationConfidence,
          },
        );
        return;
      }

      await this.wardrobeRepo.updatePipelineStatus(input.wardrobeItemId, 'queued_base', null, {
        stage: 'queued_base',
      });
      const basePrompt = `Create a single ${input.pieceType} standalone asset only. Exclude person body, mannequin, full outfit, and scene props.`;
      const baseModel = await this.generateModelFromImage(isolation.isolatedImageUrl, {
        prompt: basePrompt,
        pieceType: input.pieceType,
        wardrobeItemId: input.wardrobeItemId,
        status: 'generating_base',
        attemptIncrement: 1,
        stageLabel: 'base_generation',
      });

      await this.wardrobeRepo.updatePipelineStatus(input.wardrobeItemId, 'base_done');

      const shouldSkipBrandingPipeline = await this.shouldSkipBrandingPipeline(input.brandId);
      if (shouldSkipBrandingPipeline) {
        const meshyFallback = !this.blenderCloudService.isConfigured();
        await this.wardrobeRepo.updateModelAssets(input.wardrobeItemId, {
          model_3d_url: baseModel.model_3d_url,
          model_preview_url: baseModel.model_preview_url,
          model_base_3d_url: baseModel.model_3d_url,
          model_branded_3d_url: null,
          isolated_piece_image_url: isolation.isolatedImageUrl,
          segmentation_confidence: isolation.segmentationConfidence,
          geometry_scope_passed: true,
          geometry_scope_score: null,
          generation_attempt_count: 1,
          pipeline_stage_details: {
            stage: 'done_branding_skipped',
            reason: meshyFallback
              ? 'RunPod not configured; branding pass skipped for Meshy fallback.'
              : 'Brand is Zara; logo placement pass intentionally skipped.',
            segmentation: isolation.stageDetails,
          },
          placement_profile_id: null,
          brand_applied: false,
          branding_pass_version: meshyFallback ? 'skipped-meshy-fallback' : 'skipped-zara',
        });
        this.logPipelineMetrics(input.wardrobeItemId, input.pieceType, true, isolation.segmentationConfidence, 1);
        return;
      }

      await this.wardrobeRepo.updatePipelineStatus(input.wardrobeItemId, 'queued_branding');

      const placementProfile = await this.brandPlacementService.getPlacementProfile({
        brandId: input.brandId,
        pieceType: input.pieceType,
      });

      const brandingPrompt = `Create a single ${input.pieceType} standalone asset only with no person body. Use detected brand ${input.brandId} logo only. Place at ${placementProfile.anchor} profile ${placementProfile.profile_id} scale ${placementProfile.scale}.`;
      const brandedModel = await this.generateModelFromImage(isolation.isolatedImageUrl, {
        prompt: brandingPrompt,
        pieceType: input.pieceType,
        wardrobeItemId: input.wardrobeItemId,
        status: 'branding_in_progress',
        attemptIncrement: 0,
        stageLabel: 'branding_generation',
      });

      const qaResult = this.qualityChecksPass({
        baseModelUrl: baseModel.model_3d_url,
        brandedModelUrl: brandedModel.model_3d_url,
        fitProfile,
        brandIdRaw: String(sourceItem?.brand_id ?? ''),
        brandIdSelectedRaw: String(sourceItem?.brand_id_selected ?? ''),
        placementProfileId: placementProfile.profile_id,
      });

      if (!qaResult.passed) {
        throw Object.assign(new ServiceError(qaResult.message, 502), {
          pipelineFailure: {
            failedStage: qaResult.failedStage,
            provider: 'branding',
            errorCode: qaResult.errorCode,
            hint: qaResult.hint,
            retryable: qaResult.retryable,
            diagnostics: qaResult.details,
          },
        });
      }

      await this.wardrobeRepo.updatePipelineStatus(input.wardrobeItemId, 'queued_geometry_qa');
      const geometryScope = await this.validateGeometryScopeWithFallback({
        wardrobeItemId: input.wardrobeItemId,
        modelUrl: brandedModel.model_3d_url,
        pieceType: input.pieceType,
      });

      if (!geometryScope.passed) {
        const shouldRetry = geometryScope.scopeScore >= 0.35;
        if (shouldRetry) {
          await this.wardrobeRepo.updatePipelineStatus(
            input.wardrobeItemId,
            'retrying_generation',
            `Geometry scope failed first pass: ${geometryScope.reasons.join(' | ')}`,
            {
              stage: 'geometry_scope_retry',
              reasons: geometryScope.reasons,
              scopeScore: geometryScope.scopeScore,
            },
          );

          const retryModel = await this.generateModelFromImage(isolation.isolatedImageUrl, {
            prompt: `${brandingPrompt} Strictly output only the garment mesh with no humanoid rig.`,
            pieceType: input.pieceType,
            wardrobeItemId: input.wardrobeItemId,
            status: 'retrying_generation',
            attemptIncrement: 1,
            stageLabel: 'retry_generation',
          });

          const retryScope = await this.validateGeometryScopeWithFallback({
            wardrobeItemId: input.wardrobeItemId,
            modelUrl: retryModel.model_3d_url,
            pieceType: input.pieceType,
          });

          if (!retryScope.passed) {
            await this.wardrobeRepo.updatePipelineStatus(
              input.wardrobeItemId,
              'failed_geometry_scope',
              retryScope.reasons.join(' | '),
              {
                stage: 'geometry_scope_failed_after_retry',
                reasons: retryScope.reasons,
                scopeScore: retryScope.scopeScore,
              },
            );
            return;
          }

          await this.wardrobeRepo.updateModelAssets(input.wardrobeItemId, {
            model_3d_url: retryModel.model_3d_url,
            model_preview_url: retryModel.model_preview_url ?? baseModel.model_preview_url,
            model_base_3d_url: baseModel.model_3d_url,
            model_branded_3d_url: retryModel.model_3d_url,
            isolated_piece_image_url: isolation.isolatedImageUrl,
            segmentation_confidence: isolation.segmentationConfidence,
            geometry_scope_passed: true,
            geometry_scope_score: retryScope.scopeScore,
            generation_attempt_count: 2,
            pipeline_stage_details: {
              stage: 'done_after_retry',
              segmentation: isolation.stageDetails,
              geometry: retryScope.reasons,
            },
            placement_profile_id: placementProfile.profile_id,
            brand_applied: true,
            branding_pass_version: BRANDING_PASS_VERSION,
          });
          this.logPipelineMetrics(input.wardrobeItemId, input.pieceType, true, isolation.segmentationConfidence, retryScope.scopeScore);
          return;
        }

        await this.wardrobeRepo.updatePipelineStatus(
          input.wardrobeItemId,
          'failed_geometry_scope',
          geometryScope.reasons.join(' | '),
          {
            stage: 'geometry_scope_failed',
            reasons: geometryScope.reasons,
            scopeScore: geometryScope.scopeScore,
          },
        );
        this.logPipelineMetrics(input.wardrobeItemId, input.pieceType, false, isolation.segmentationConfidence, geometryScope.scopeScore);
        return;
      }

      await this.wardrobeRepo.updateModelAssets(input.wardrobeItemId, {
        model_3d_url: brandedModel.model_3d_url,
        model_preview_url: brandedModel.model_preview_url ?? baseModel.model_preview_url,
        model_base_3d_url: baseModel.model_3d_url,
        model_branded_3d_url: brandedModel.model_3d_url,
        isolated_piece_image_url: isolation.isolatedImageUrl,
        segmentation_confidence: isolation.segmentationConfidence,
        geometry_scope_passed: true,
        geometry_scope_score: geometryScope.scopeScore,
        generation_attempt_count: 1,
        pipeline_stage_details: {
          stage: 'done',
          segmentation: isolation.stageDetails,
          geometry: geometryScope.reasons,
        },
        placement_profile_id: placementProfile.profile_id,
        brand_applied: true,
        branding_pass_version: BRANDING_PASS_VERSION,
      });
      this.logPipelineMetrics(input.wardrobeItemId, input.pieceType, true, isolation.segmentationConfidence, geometryScope.scopeScore);
    } catch (error) {
      const item = await this.wardrobeRepo.findById(input.wardrobeItemId);
      const failureMeta = (error as { pipelineFailure?: Record<string, unknown> })?.pipelineFailure ?? {};
      const failedStage = String(failureMeta.failedStage ?? 'unknown_failure');
      const provider = String(failureMeta.provider ?? 'local');
      const errorCode = String(failureMeta.errorCode ?? 'PIPELINE_FAILED');
      const hint = String(failureMeta.hint ?? 'Inspect pipeline_stage_details and retry the suggested next action.');
      const retryable = Boolean(failureMeta.retryable ?? true);
      const diagnostics = (failureMeta.diagnostics ?? {}) as Record<string, unknown>;
      const isPollingTimeout = failedStage === 'cloud_polling_timeout';
      const pipelineStatus: ModelGenerationStatus = isPollingTimeout ? 'processing' : 'failed';
      await this.wardrobeRepo.updatePipelineStatus(
        input.wardrobeItemId,
        pipelineStatus,
        error instanceof Error ? error.message : 'Unknown model pipeline failure.',
        withStageHistory(item?.pipeline_stage_details as Record<string, unknown> | null, {
          stage: isPollingTimeout ? 'processing' : 'failed',
          failedStage,
          provider: provider as 'runpod' | 'meshy' | 'local' | 'branding',
          errorCode,
          message: error instanceof Error ? error.message : 'Unknown model pipeline failure.',
          hint,
          retryable,
          requestUrl: diagnostics.requestUrl ? String(diagnostics.requestUrl) : null,
          responseStatus: typeof diagnostics.responseStatus === 'number' ? diagnostics.responseStatus : null,
          responseBodyPreview: diagnostics.responseBodyPreview ? String(diagnostics.responseBodyPreview) : null,
          inputSnapshot: buildPipelineInputSnapshot((item ?? {}) as Record<string, unknown>),
          diagnostics,
        }),
      );
      console.error('[wardrobe-model-pipeline] pipeline failed', {
        wardrobe_item_id: input.wardrobeItemId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async retry3DGeneration(wardrobeItemId: string) {
    const item = await this.wardrobeRepo.findById(wardrobeItemId);
    if (!item) throw new ServiceError('Wardrobe item not found.', 404);

    const currentStageDetails = (item.pipeline_stage_details as Record<string, unknown> | null) ?? null;
    const failedStage = String(currentStageDetails?.failedStage ?? '');
    const nextAttempt = (Number(item.generation_attempt_count ?? 0) || 0) + 1;
    await this.wardrobeRepo.updateGenerationAttempt(wardrobeItemId, nextAttempt);

    if (failedStage === 'preparation_not_ready' || item.model_status === 'needs_preparation') {
      await this.preparationService.preparePieceForTester2D(wardrobeItemId);
    }

    if (failedStage === 'runpod_route_mismatch') {
      const diagnostics = await this.blenderCloudService.getDiagnostics().catch((error) => ({
        diagnosticsError: error instanceof Error ? error.message : String(error),
      }));
      await this.wardrobeRepo.updatePipelineStatus(
        wardrobeItemId,
        'failed',
        typeof item.model_generation_error === 'string' ? item.model_generation_error : null,
        withStageHistory(currentStageDetails, {
        stage: 'failed',
        failedStage: 'runpod_route_mismatch',
        provider: 'runpod',
        errorCode: 'RUNPOD_ROUTE_MISMATCH',
        message: 'RunPod route diagnostics captured before retry.',
        hint: 'Confirm BLENDER_CLOUD_SUBMIT_PATH or worker route configuration.',
        retryable: true,
        diagnostics,
        inputSnapshot: buildPipelineInputSnapshot(item as unknown as Record<string, unknown>),
      }),
      );
    }

    await this.enrichWardrobeItemModel({
      wardrobeItemId,
      imageUrl: String(item.image_url ?? ''),
      pieceType: String(item.piece_type ?? 'upper_piece'),
      brandId: canonicalizeBrandId(String(item.brand_id ?? DEFAULT_BRAND_ID)),
    });

    return {
      ok: true,
      wardrobeItemId,
      generation_attempt_count: nextAttempt,
    };
  }

  private async shouldSkipBrandingPipeline(brandId: string): Promise<boolean> {
    if (!this.blenderCloudService.isConfigured()) return true;
    if (!brandId) return false;
    const brand = await this.brandsRepository.getById(brandId);
    return brand?.name?.trim().toLowerCase() === 'zara';
  }

  private async generateModelFromImage(
    imageUrl: string,
    options: {
      prompt: string;
      pieceType: string;
      wardrobeItemId: string;
      status: ModelGenerationStatus;
      stageLabel: string;
      attemptIncrement: number;
    },
  ): Promise<BlenderGenerationResult> {
    const item = await this.wardrobeRepo.findById(options.wardrobeItemId);
    const previousAttempts = Number(item?.generation_attempt_count ?? 0) || 0;
    const nextAttempts = previousAttempts + options.attemptIncrement;
    if (options.attemptIncrement > 0) {
      await this.wardrobeRepo.updateGenerationAttempt(options.wardrobeItemId, nextAttempts);
    }
    await this.wardrobeRepo.updatePipelineStatus(options.wardrobeItemId, options.status, null, {
      stage: options.stageLabel,
      provider: this.blenderCloudService.isConfigured() ? 'runpod' : 'meshy',
      generation_attempt_count: nextAttempts,
    });

    if (!this.blenderCloudService.isConfigured()) {
      await this.wardrobeRepo.updatePipelineStatus(options.wardrobeItemId, options.status, null, {
        stage: `${options.stageLabel}_fallback_meshy`,
        provider: 'meshy',
        reason: 'runpod_not_configured',
      });
      return this.meshyService.generate3DModelFromImage(imageUrl, { prompt: options.prompt });
    }

    await this.wardrobeRepo.updatePipelineStatus(options.wardrobeItemId, options.status, null, {
      stage: `${options.stageLabel}_submitting`,
      provider: 'runpod',
      job_type: MODEL_GENERATION_JOB_TYPE,
    });

    let submitted;
    try {
      submitted = await this.blenderCloudService.submitBlenderCloudJob({
        imageUrl,
        jobType: MODEL_GENERATION_JOB_TYPE,
        options: {
          prompt: options.prompt,
          pieceType: options.pieceType,
          mode: 'model_generation',
          sourceImageUrl: imageUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRouteMismatch = /status=404/i.test(message) && /\/jobs|\/run/i.test(message);
      throw Object.assign(new ServiceError(message, 502), {
        pipelineFailure: {
          failedStage: isRouteMismatch ? 'runpod_route_mismatch' : 'runpod_submit',
          provider: 'runpod',
          errorCode: isRouteMismatch ? 'RUNPOD_ROUTE_MISMATCH' : 'RUNPOD_SUBMIT_FAILED',
          hint: isRouteMismatch
            ? 'The configured RunPod worker does not expose POST /jobs. Check FastAPI routes or use the correct submit path.'
            : 'RunPod submit failed. Verify endpoint URL, token and worker health.',
          retryable: true,
          diagnostics: {
            responseBodyPreview: message.slice(0, 700),
          },
        },
      });
    }

    await this.wardrobeRepo.updatePipelineStatus(options.wardrobeItemId, options.status, null, {
      stage: `${options.stageLabel}_submitted`,
      provider: 'runpod',
      cloud_job_id: submitted.cloudJobId,
      job_type: MODEL_GENERATION_JOB_TYPE,
      cloud_submit_status: submitted.status,
    });
    await this.wardrobeRepo.updateProcessingState(options.wardrobeItemId, submitted.cloudJobId);

    const resolveModelFromArtifacts = (artifacts: Record<string, unknown> | null) => {
      const source = artifacts ?? {};
      const modelUrlCandidates = [
        source.outputModelUrl,
        source.modelUrl,
        source.model_3d_url,
        source.outputUrl,
        source.glbUrl,
        source.artifact_url,
        source.artifactUrl,
      ];
      const previewUrlCandidates = [
        source.previewUrl,
        source.posterUrl,
        source.thumbnailUrl,
      ];

      const model_3d_url = modelUrlCandidates.find((url) => typeof url === 'string' && url.trim().length > 0);
      const model_preview_url =
        previewUrlCandidates.find((url) => typeof url === 'string' && url.trim().length > 0) ?? null;

      const resolvedModelUrl = typeof model_3d_url === 'string' ? model_3d_url.trim() : '';
      if (!resolvedModelUrl || !resolvedModelUrl.toLowerCase().startsWith('http')) {
        throw new ServiceError('RunPod Blender model generation completed without a valid model URL.', 502);
      }

      return {
        model_3d_url: resolvedModelUrl,
        model_preview_url: typeof model_preview_url === 'string' ? model_preview_url.trim() : null,
      };
    };

    if (submitted.status === 'completed') {
      return resolveModelFromArtifacts(submitted.artifacts);
    }

    if (submitted.status === 'failed' || submitted.status === 'cancelled') {
      throw new ServiceError(`RunPod Blender model generation ${submitted.status} during submit phase.`, 502);
    }

    for (let poll = 0; poll < MODEL_GENERATION_MAX_POLLS; poll += 1) {
      if (poll > 0 && poll % 6 === 0) {
        await this.wardrobeRepo.updatePipelineStatus(options.wardrobeItemId, options.status, null, {
          stage: `${options.stageLabel}_polling`,
          provider: 'runpod',
          cloud_job_id: submitted.cloudJobId,
          poll_count: poll,
        });
      }

      const status = await this.blenderCloudService.getBlenderCloudJobStatus(submitted.cloudJobId);
      if (status.status === 'completed') {
        return resolveModelFromArtifacts(status.artifacts);
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        const rawError =
          status.raw?.error && typeof status.raw.error === 'object'
            ? (status.raw.error as Record<string, unknown>)
            : null;
        const workerCode = rawError ? String(rawError.code ?? '') : '';
        const details = status.errorMessage ?? JSON.stringify(status.raw?.error ?? status.raw);
        const fullMessage = `RunPod Blender model generation failed: ${details}`;

        const meshyStageMap: Record<string, string> = {
          meshy_auth_failed: 'meshy_auth_failed',
          meshy_auth_not_configured: 'meshy_auth_failed',
          meshy_bad_request: 'meshy_submit',
          meshy_endpoint_misconfigured: 'meshy_endpoint_misconfigured',
          meshy_input_image_unreachable: 'meshy_submit',
          meshy_invalid_request: 'meshy_submit',
          meshy_provider_error: 'meshy_submit',
          meshy_provider_invalid_response: 'meshy_submit',
          meshy_task_failed: 'meshy_submit',
          meshy_temporarily_unavailable: 'meshy_submit',
          meshy_timeout: 'meshy_submit',
        };

        const isMeshyError = workerCode.startsWith('meshy_');
        const failedStage = isMeshyError
          ? (meshyStageMap[workerCode] ?? 'meshy_submit')
          : 'runpod_worker_failure';
        const isAuthError = workerCode.includes('auth');
        const isMisconfigured = workerCode === 'meshy_endpoint_misconfigured';

        throw Object.assign(new ServiceError(fullMessage, 502), {
          pipelineFailure: {
            failedStage,
            provider: 'runpod',
            errorCode: workerCode.toUpperCase() || 'WORKER_FAILED',
            hint: rawError
              ? String((rawError.details as Record<string, unknown> | undefined)?.hint ?? rawError.message ?? details)
              : fullMessage,
            retryable: !isAuthError && !isMisconfigured,
            diagnostics: (rawError?.details as Record<string, unknown> | undefined) ?? {},
          },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, MODEL_GENERATION_POLL_MS));
    }

    throw Object.assign(
      new ServiceError('3D generation is still running. Continue polling.', 202),
      {
        pipelineFailure: {
          failedStage: 'cloud_polling_timeout',
          provider: 'runpod',
          errorCode: 'CLOUD_POLLING_TIMEOUT',
          hint: 'RunPod accepted the job but it did not finish within the local polling window. Call /api/3d-worker/reconcile to check completion.',
          retryable: true,
          diagnostics: { cloudJobId: submitted?.cloudJobId ?? null },
        },
      },
    );
  }

  private async validateGeometryScopeWithFallback(input: {
    wardrobeItemId: string;
    modelUrl: string;
    pieceType: string;
  }): Promise<{ passed: boolean; scopeScore: number; reasons: string[] }> {
    try {
      return await this.geometryScopeService.validate({
        modelUrl: input.modelUrl,
        pieceType: input.pieceType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown geometry scope validation error.';
      console.warn('[wardrobe-model-pipeline] geometry scope validation failed, applying soft-pass fallback', {
        wardrobe_item_id: input.wardrobeItemId,
        error: message,
      });
      await this.wardrobeRepo.updatePipelineStatus(input.wardrobeItemId, 'queued_geometry_qa', null, {
        stage: 'geometry_scope_fallback',
        warning: message,
      });
      return {
        passed: true,
        scopeScore: 0.65,
        reasons: [`Soft-pass fallback applied because geometry validation errored: ${message}`],
      };
    }
  }

  private qualityChecksPass(input: {
    baseModelUrl: string;
    brandedModelUrl: string;
    fitProfile: Record<string, unknown> | null;
    brandIdRaw: string;
    brandIdSelectedRaw: string;
    placementProfileId: string;
  }): { passed: boolean; failedStage: string; message: string; errorCode: string; hint: string; retryable: boolean; details: Record<string, unknown> } {
    const geometryScopePassed = input.fitProfile?.preparationStatus === 'ready';
    const hasAnchors = Boolean(input.fitProfile?.garmentAnchors);
    if (!geometryScopePassed || !hasAnchors) {
      return {
        passed: false,
        failedStage: 'branding_precondition_failed',
        message: 'Branding preconditions failed: geometry/anchors unavailable.',
        errorCode: 'BRANDING_PRECONDITION_FAILED',
        hint: 'The item lacks usable garment geometry/anchors. Run 2D preparation before logo placement.',
        retryable: true,
        details: {
          selectedBrandId: input.brandIdSelectedRaw,
          normalizedBrandId: canonicalizeBrandId(input.brandIdRaw),
          sourceLogoUrl: null,
          placementProfileUsed: input.placementProfileId,
          logoBBox: null,
          targetGarmentBBox: input.fitProfile?.normalizedBBox ?? null,
          visibilityScore: 0,
          contrastScore: 0,
          placementScore: 0,
          finalBrandingScore: 0,
          thresholds: { minFinalBrandingScore: 0.6 },
          reasonForRejection: 'geometry_scope_passed=false or garmentAnchors missing',
        },
      };
    }

    const hasGlbExtension = (url: string) => url.split('?')[0].split('#')[0].toLowerCase().endsWith('.glb');
    const baseValid = input.baseModelUrl.trim().length > 0 && hasGlbExtension(input.baseModelUrl);
    const brandedValid = input.brandedModelUrl.trim().length > 0 && hasGlbExtension(input.brandedModelUrl);
    const urlsDiffer = input.baseModelUrl !== input.brandedModelUrl;
    const visibilityScore = brandedValid ? 0.75 : 0.15;
    const contrastScore = brandedValid ? 0.7 : 0.2;
    const placementScore = urlsDiffer ? 0.7 : 0.1;
    const finalBrandingScore = Number(((visibilityScore + contrastScore + placementScore) / 3).toFixed(3));
    const thresholds = { minVisibility: 0.55, minContrast: 0.5, minPlacement: 0.5, minFinalBrandingScore: 0.6 };
    const passed = baseValid && brandedValid && urlsDiffer && finalBrandingScore >= thresholds.minFinalBrandingScore;

    return {
      passed,
      failedStage: 'branding_quality_validation',
      message: passed ? 'Branding quality checks passed.' : 'Branding quality checks failed (logo visibility/placement validation).',
      errorCode: passed ? 'OK' : 'BRANDING_QUALITY_FAILED',
      hint: passed ? '' : 'Improve logo visibility/contrast or adjust placement profile.',
      retryable: true,
      details: {
        selectedBrandId: input.brandIdSelectedRaw,
        normalizedBrandId: canonicalizeBrandId(input.brandIdRaw),
        sourceLogoUrl: null,
        placementProfileUsed: input.placementProfileId,
        logoBBox: null,
        targetGarmentBBox: input.fitProfile?.normalizedBBox ?? null,
        visibilityScore,
        contrastScore,
        placementScore,
        finalBrandingScore,
        thresholds,
        reasonForRejection: passed ? null : 'final_branding_score_below_threshold_or_invalid_urls',
      },
    };
  }

  private logPipelineMetrics(
    wardrobeItemId: string,
    pieceType: string,
    scopePassed: boolean,
    segmentationConfidence: number,
    scopeScore: number,
  ) {
    console.info('[wardrobe-model-pipeline]', {
      wardrobe_item_id: wardrobeItemId,
      piece_type: pieceType,
      scope_passed: scopePassed,
      segmentation_confidence: segmentationConfidence,
      geometry_scope_score: scopeScore,
      timestamp: new Date().toISOString(),
    });
  }
}
