'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AssetJobStatus = 'idle' | 'submitting' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'timed_out' | 'cancelled';

interface Use3dAssetJobOptions {
  pollIntervalMs?: number;
  maxPollIntervalMs?: number;
  timeoutMs?: number;
  maxPollAttempts?: number;
  onCompleted?: (artifactUrl: string) => void;
}

interface StartJobInput {
  existingJobId?: string | null;
  existingArtifactUrl?: string | null;
  createJob?: () => Promise<unknown>;
  pollJob: (jobId: string) => Promise<unknown>;
}

const TERMINAL_STATUSES: AssetJobStatus[] = ['completed', 'failed', 'timed_out', 'cancelled'];

function normalizeStatus(statusLike: unknown): AssetJobStatus {
  const normalized = String(statusLike ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!normalized) return 'idle';
  if (['completed', 'ready', 'asset_available', 'done'].includes(normalized)) return 'completed';
  if (['failed', 'error'].includes(normalized)) return 'failed';
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
  if (['queued', 'pending', 'submitted'].includes(normalized)) return 'queued';
  if (['in_progress', 'processing', 'running'].includes(normalized)) return 'in_progress';
  if (normalized === 'submitting') return 'submitting';
  return 'idle';
}

function extractArtifactUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  const artifacts = (source.artifacts ?? {}) as Record<string, unknown>;
  const candidate = source.model_3d_url
    ?? source.modelUrl
    ?? artifacts.model_3d_url
    ?? artifacts.modelUrl
    ?? artifacts.outputModelUrl
    ?? artifacts.outputUrl
    ?? artifacts.glbUrl;

  const url = typeof candidate === 'string' ? candidate.trim() : '';
  return url.length > 0 ? url : null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  const error = source.error;
  if (typeof error === 'string' && error.trim()) return error.trim();

  if (error && typeof error === 'object') {
    const structured = error as Record<string, unknown>;
    const code = typeof structured.code === 'string' ? structured.code.trim() : '';
    const message = typeof structured.message === 'string' ? structured.message.trim() : '';
    if (code === 'invalid_input_low_quality') {
      return '3D generation failed: cleaned garment too dark/low contrast. Ready for 2D try-on.';
    }
    if (message) return message;
  }

  const diagnostics = source.diagnostics && typeof source.diagnostics === 'object'
    ? (source.diagnostics as Record<string, unknown>)
    : null;
  const brightness = Number(diagnostics?.brightness ?? NaN);
  const contrast = Number(diagnostics?.contrast ?? NaN);
  const score = Number(diagnostics?.qualityScore ?? NaN);
  if (Number.isFinite(brightness) || Number.isFinite(contrast) || Number.isFinite(score)) {
    return '3D generation failed: cleaned garment too dark/low contrast. Ready for 2D try-on.';
  }

  return null;
}

function extractJobId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  const jobId = source.jobId ?? source.job_id ?? source.id;
  return typeof jobId === 'string' && jobId.trim().length > 0 ? jobId.trim() : null;
}

export function use3dAssetJob(options?: Use3dAssetJobOptions) {
  const basePollIntervalMs = options?.pollIntervalMs ?? 1500;
  const maxPollIntervalMs = options?.maxPollIntervalMs ?? 6000;
  const timeoutMs = options?.timeoutMs ?? 90000;
  const maxPollAttempts = options?.maxPollAttempts ?? 45;

  const [status, setStatus] = useState<AssetJobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [pollAttempts, setPollAttempts] = useState(0);

  const pollTimeoutRef = useRef<number | null>(null);
  const absoluteTimeoutRef = useRef<number | null>(null);
  const activeJobRef = useRef<string | null>(null);
  const pollJobRef = useRef<((jobId: string) => Promise<unknown>) | null>(null);
  const attemptsRef = useRef(0);
  const transientFailuresRef = useRef(0);
  const MAX_TRANSIENT_FAILURES = 3;

  const stopTimers = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (absoluteTimeoutRef.current !== null) {
      window.clearTimeout(absoluteTimeoutRef.current);
      absoluteTimeoutRef.current = null;
    }
  }, []);

  const completeWithArtifact = useCallback((url: string) => {
    stopTimers();
    setArtifactUrl(url);
    setStatus('completed');
    setProgressPercent(100);
    setError(null);
    options?.onCompleted?.(url);
  }, [options, stopTimers]);

  const failJob = useCallback((nextStatus: 'failed' | 'timed_out' | 'cancelled', message: string) => {
    stopTimers();
    setStatus(nextStatus);
    setError(message);
    setProgressPercent((current) => Math.max(10, Math.min(99, current)));
  }, [stopTimers]);

  const schedulePoll = useCallback((execute: () => Promise<void>, attempt: number) => {
    const interval = Math.min(maxPollIntervalMs, Math.round(basePollIntervalMs * Math.pow(1.25, Math.max(0, attempt - 1))));
    pollTimeoutRef.current = window.setTimeout(() => {
      void execute();
    }, interval);
  }, [basePollIntervalMs, maxPollIntervalMs]);

  const startPolling = useCallback((nextJobId: string, pollJob: (id: string) => Promise<unknown>) => {
    stopTimers();
    activeJobRef.current = nextJobId;
    pollJobRef.current = pollJob;
    attemptsRef.current = 0;
    transientFailuresRef.current = 0;
    setPollAttempts(0);

    absoluteTimeoutRef.current = window.setTimeout(() => {
      failJob('timed_out', '3D generation timed out. Please retry.');
    }, timeoutMs);

    const runPoll = async (): Promise<void> => {
      attemptsRef.current += 1;
      setPollAttempts(attemptsRef.current);

      if (attemptsRef.current > maxPollAttempts) {
        failJob('timed_out', `3D generation exceeded ${maxPollAttempts} polling attempts.`);
        return;
      }

      try {
        const payload = await pollJob(nextJobId);
        transientFailuresRef.current = 0;
        const polledStatus = normalizeStatus((payload as Record<string, unknown>)?.status);
        const resolvedArtifact = extractArtifactUrl(payload);

        if (resolvedArtifact) {
          completeWithArtifact(resolvedArtifact);
          return;
        }

        if (polledStatus === 'completed') {
          failJob('failed', '3D generation finished but no model URL was returned.');
          return;
        }

        if (polledStatus === 'failed') {
          failJob('failed', extractErrorMessage(payload) ?? '3D generation failed.');
          return;
        }

        if (polledStatus === 'cancelled') {
          failJob('cancelled', '3D generation was cancelled.');
          return;
        }

        const nextStatus = polledStatus === 'queued' ? 'queued' : 'in_progress';
        setStatus(nextStatus);
        setProgressPercent((current) => {
          if (nextStatus === 'queued') {
            return Math.min(65, Math.max(15, current + 4));
          }
          return Math.min(95, Math.max(35, current + 5));
        });

        schedulePoll(runPoll, attemptsRef.current);
      } catch (pollError) {
        transientFailuresRef.current += 1;
        if (transientFailuresRef.current >= MAX_TRANSIENT_FAILURES) {
          failJob('failed', pollError instanceof Error ? pollError.message : 'Unable to poll 3D generation status.');
        } else {
          schedulePoll(runPoll, attemptsRef.current);
        }
      }
    };

    void runPoll();
  }, [completeWithArtifact, failJob, maxPollAttempts, schedulePoll, stopTimers, timeoutMs]);

  const startJob = useCallback(async (input: StartJobInput) => {
    setError(null);
    setArtifactUrl(null);
    setProgressPercent(5);
    setPollAttempts(0);

    if (input.existingArtifactUrl?.trim()) {
      completeWithArtifact(input.existingArtifactUrl.trim());
      return;
    }

    if (input.existingJobId?.trim()) {
      const existing = input.existingJobId.trim();
      setJobId(existing);
      setStatus('queued');
      setProgressPercent(18);
      startPolling(existing, input.pollJob);
      return;
    }

    if (!input.createJob) {
      failJob('failed', 'No active 3D generation job was found for this item.');
      return;
    }

    setStatus('submitting');
    setProgressPercent(12);

    try {
      const createdPayload = await input.createJob();
      const createdArtifact = extractArtifactUrl(createdPayload);
      if (createdArtifact) {
        completeWithArtifact(createdArtifact);
        return;
      }

      const createdJobId = extractJobId(createdPayload);
      if (!createdJobId) {
        failJob('failed', 'The generation request did not return a valid job id.');
        return;
      }

      const normalized = normalizeStatus((createdPayload as Record<string, unknown>)?.status);
      setJobId(createdJobId);
      setStatus(normalized === 'idle' ? 'queued' : normalized);
      setProgressPercent(normalized === 'in_progress' ? 35 : 20);

      if (TERMINAL_STATUSES.includes(normalized)) {
        if (normalized !== 'completed') {
          failJob(normalized === 'cancelled' ? 'cancelled' : 'failed', '3D generation ended before polling started.');
        }
        return;
      }

      startPolling(createdJobId, input.pollJob);
    } catch (submitError) {
      failJob('failed', submitError instanceof Error ? submitError.message : 'Unable to submit 3D generation job.');
    }
  }, [completeWithArtifact, failJob, startPolling]);

  const cancelPolling = useCallback(() => {
    stopTimers();
    activeJobRef.current = null;
    if (!TERMINAL_STATUSES.includes(status)) {
      setStatus('idle');
      setProgressPercent(0);
    }
  }, [status, stopTimers]);

  const retry = useCallback(() => {
    if (!activeJobRef.current || !pollJobRef.current) {
      setStatus('idle');
      setProgressPercent(0);
      setError(null);
      setPollAttempts(0);
      return;
    }

    setError(null);
    setStatus('queued');
    setProgressPercent(20);
    startPolling(activeJobRef.current, pollJobRef.current);
  }, [startPolling]);

  useEffect(() => () => stopTimers(), [stopTimers]);

  return {
    status,
    progressPercent,
    pollAttempts,
    jobId,
    artifactUrl,
    error,
    startJob,
    cancelPolling,
    retry,
    setArtifactUrl,
    setJobId,
    setStatus,
    setError,
  };
}
