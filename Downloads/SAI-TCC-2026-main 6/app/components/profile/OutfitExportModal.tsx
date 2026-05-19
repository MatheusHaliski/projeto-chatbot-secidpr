'use client';

import { useMemo, useState } from 'react';
import { useOutfitExport } from '@/app/hooks/useOutfitExport';
import { SocialPlatform } from '@/app/components/profile/types';

interface OutfitExportModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  outfitId: string;
  schemeId?: string;
  title: string;
  sourceImageUrl: string;
  defaultCaption?: string;
  onExported?: () => void;
}

export default function OutfitExportModal({
  open,
  onClose,
  userId,
  outfitId,
  schemeId,
  title,
  sourceImageUrl,
  defaultCaption,
  onExported,
}: OutfitExportModalProps) {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [format, setFormat] = useState<'square' | 'portrait' | 'story'>('square');
  const [exportMode, setExportMode] = useState<'image_only' | 'image_with_caption'>('image_with_caption');
  const [caption, setCaption] = useState(defaultCaption || `Styled with SAI • ${title}`);
  const [error, setError] = useState('');
  const { exportOutfit, submitting } = useOutfitExport();

  const previewRatio = useMemo(() => {
    if (format === 'portrait') return 'aspect-[4/5]';
    if (format === 'story') return 'aspect-[9/16]';
    return 'aspect-square';
  }, [format]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/25 bg-gradient-to-br from-[#111b4a] via-[#0f6f67] to-[#198c5e] p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Export to Social</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/30 px-3 py-1 text-xs text-white">Close</button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs text-white/75">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as SocialPlatform)} className="w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="x">X</option>
            </select>
            <label className="block text-xs text-white/75">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as 'square' | 'portrait' | 'story')} className="w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="square">Square</option>
              <option value="portrait">Portrait</option>
              <option value="story">Story-ready</option>
            </select>
            <label className="block text-xs text-white/75">Export mode</label>
            <select value={exportMode} onChange={(e) => setExportMode(e.target.value as 'image_only' | 'image_with_caption')} className="w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="image_only">Card image only</option>
              <option value="image_with_caption">Card image + caption</option>
            </select>
            <label className="block text-xs text-white/75">Caption</label>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <p className="mb-2 text-xs text-white/75">Preview</p>
            <div className={`overflow-hidden rounded-2xl border border-white/20 ${previewRatio}`}>
              <img src={sourceImageUrl} alt={`${title} preview`} className="h-full w-full object-cover" />
            </div>
            <p className="mt-2 text-xs text-white/70">Phase 1 export: generated asset + metadata record + download-ready artifact.</p>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white">Cancel</button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setError('');
              try {
                await exportOutfit({
                  userId,
                  outfitId,
                  schemeId,
                  platform,
                  format,
                  exportMode,
                  caption,
                  sourceImageUrl,
                });
                onExported?.();
                onClose();
              } catch (exportError) {
                setError(exportError instanceof Error ? exportError.message : 'Export failed');
              }
            }}
            className="rounded-lg border border-cyan-300/50 bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-100 disabled:opacity-60"
          >
            {submitting ? 'Exporting...' : 'Confirm export'}
          </button>
        </div>
      </div>
    </div>
  );
}
