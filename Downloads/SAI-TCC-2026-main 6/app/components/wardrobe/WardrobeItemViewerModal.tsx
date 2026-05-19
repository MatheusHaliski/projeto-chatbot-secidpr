'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { getBest2DAssetForWardrobeItem } from '@/app/services/Tester2DAssetResolver';

interface WardrobeViewerItem {
  name: string;
  image_url: string;
  model_preview_url?: string | null;
  model_3d_url?: string | null;
  model_status?: string;
  brand_applied?: boolean;
  image_assets?: {
    raw_upload_image_url?: string | null;
    normalized_2d_preview_url?: string | null;
    approved_catalog_2d_url?: string | null;
  };
}

interface Props {
  open: boolean;
  item: WardrobeViewerItem | null;
  onClose: () => void;
  onOpen3D: () => void;
}

export default function WardrobeItemViewerModal({ open, item, onClose, onOpen3D }: Props) {
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('2d');

  const image2d = useMemo(() => {
    if (!item) return '';
    return getBest2DAssetForWardrobeItem(item);
  }, [item]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm sm:p-5" onClick={onClose}>
      <div
        className="max-h-[86vh] w-[94vw] overflow-y-auto overflow-x-hidden rounded-[28px] border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(248,251,255,0.88)_58%,rgba(240,246,255,0.86)_100%)] p-4 shadow-[0_28px_70px_rgba(15,23,42,0.18)] backdrop-blur-[18px] backdrop-saturate-[160%] sm:max-h-[82vh] sm:w-[min(92vw,720px)] sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="pr-2 text-xl font-semibold text-slate-900">{item.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-900/12 bg-white/75 px-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('2d')}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              activeTab === '2d'
                ? 'border-indigo-400/60 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] text-white shadow-[0_10px_24px_rgba(79,70,229,0.32)]'
                : 'border-white/80 bg-white/65 text-slate-700 hover:bg-white/80'
            }`}
          >
            2D (default)
          </button>
          <button
            onClick={() => setActiveTab('3d')}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              activeTab === '3d'
                ? 'border-indigo-400/60 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] text-white shadow-[0_10px_24px_rgba(79,70,229,0.32)]'
                : 'border-white/80 bg-white/65 text-slate-700 hover:bg-white/80'
            }`}
          >
            3D
          </button>
        </div>

        {activeTab === '2d' ? (
          <div
            className="relative mx-auto w-full overflow-hidden rounded-[18px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-4"
            style={{ maxHeight: '52vh' }}
          >
            <div className="relative mx-auto aspect-[3/4] h-full w-full max-w-full sm:max-h-[58vh]">
              <Image src={image2d} alt={`${item.name} 2D view`} fill className="object-contain" unoptimized />
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-5">
            <p className="mb-3 text-sm text-slate-600">Open the immersive model viewer for this item.</p>
            {String(item.model_status ?? '').trim().toLowerCase() === 'completed' && item.brand_applied === false ? (
              <p className="mb-3 rounded-lg border border-amber-300/70 bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
                3D model generated without logo branding.
              </p>
            ) : null}
            <button
              onClick={onOpen3D}
              className="rounded-xl border border-indigo-400/60 bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(79,70,229,0.32)]"
            >
              Open 3D viewer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
