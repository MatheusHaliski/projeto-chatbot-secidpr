'use client';

import type { AssetJobStatus } from '@/app/hooks/use3dAssetJob';

interface Props {
  open: boolean;
  status: AssetJobStatus;
  progressPercent: number;
  error?: string | null;
  pollAttempts?: number;
  onClose: () => void;
  onRetry: () => void;
}

const STATUS_COPY: Record<AssetJobStatus, { title: string; stage: string }> = {
  idle: { title: 'Preparing 3D Viewer', stage: 'Waiting to start' },
  submitting: { title: 'Preparing 3D Viewer', stage: 'Submitting generation request' },
  queued: { title: 'Generating 3D Asset', stage: 'Queue pending' },
  in_progress: { title: 'Generating 3D Asset', stage: 'Processing mesh pipeline' },
  completed: { title: 'Generating 3D Asset', stage: 'Ready' },
  failed: { title: 'Generating 3D Asset', stage: 'Failed' },
  timed_out: { title: 'Generating 3D Asset', stage: 'Timed out' },
  cancelled: { title: 'Generating 3D Asset', stage: 'Cancelled' },
};

export default function ThreeDGenerationProgressModal({ open, status, progressPercent, error, pollAttempts, onClose, onRetry }: Props) {
  if (!open) return null;

  const ui = STATUS_COPY[status];
  const isFailed = status === 'failed' || status === 'timed_out' || status === 'cancelled';
  const isLowQualityFailure = String(error ?? '').toLowerCase().includes('too dark/low contrast');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-[0_0_40px_rgba(15,23,42,0.15)]">
        <div className="mb-3 text-xs uppercase tracking-[0.25em] text-cyan-700">FashionAI • Virtual Wardrobe</div>
        <h3 className="text-xl font-semibold text-slate-900">{ui.title}</h3>
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Stage: <span className="font-medium">{ui.stage}</span>
        </p>

        {!isFailed ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>Progress (estimated while processing)</span>
              <span>{Math.max(0, Math.min(100, Math.round(progressPercent)))}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(3, Math.min(100, progressPercent))}%` }}
              />
            </div>
            {pollAttempts ? <p className="mt-2 text-xs text-slate-500">Polling attempt #{pollAttempts}</p> : null}
          </div>
        ) : null}

        {isFailed ? (
          <div className="mt-4 space-y-1 text-sm">
            {isLowQualityFailure ? <p className="text-emerald-700">Ready for 2D try-on</p> : null}
            <p className="text-rose-700">{error ?? '3D generation failed. Please retry.'}</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Cancel</button>
          {isFailed ? (
            <button type="button" onClick={onRetry} className="rounded-lg border border-cyan-300/70 bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100">Retry</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
