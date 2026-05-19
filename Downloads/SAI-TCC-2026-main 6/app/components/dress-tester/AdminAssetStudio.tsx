'use client';

import { useState } from 'react';

interface WardrobeItem {
  pieceId: string;
  name: string;
  imageUrl: string;
}

interface Props {
  onCreated: () => Promise<void>;
  wardrobeItems: WardrobeItem[];
}

export default function AdminAssetStudio({ onCreated, wardrobeItems }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleProcessAll = async () => {
    setRunning(true);
    setStatus(null);
    try {
      const response = await fetch('/api/wardrobe/process-missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, dryRun: false, onlyMissing: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setStatus('Processing failed. Check console logs.');
      } else {
        setStatus(`Processed ${payload.processed} · failed ${payload.failed} · matched ${payload.matched}.`);
        await onCreated();
      }
    } catch {
      setStatus('Unexpected error during processing.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleProcessAll()}
          disabled={running}
          className="rounded-xl border border-amber-300/60 bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-50 disabled:opacity-60"
        >
          {running ? 'Processing...' : 'Process Missing Pieces'}
        </button>
        {status && <p className="text-xs text-amber-100">{status}</p>}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
          Wardrobe Items ({wardrobeItems.length})
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {wardrobeItems.map((item) => (
            <div
              key={item.pieceId}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2"
            >
              <p className="truncate text-xs font-semibold text-white">{item.name}</p>
              <p className="truncate text-[10px] text-white/40">{item.pieceId}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
