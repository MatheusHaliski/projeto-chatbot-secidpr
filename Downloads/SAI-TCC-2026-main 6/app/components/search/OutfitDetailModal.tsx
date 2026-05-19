'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import OutfitCard from '@/app/components/outfit-card/OutfitCard';
import OutfitActionBar from '@/app/components/search/OutfitActionBar';
import { OutfitCardData } from '@/app/lib/outfit-card';

interface OutfitDetailModalProps {
  open: boolean;
  data: OutfitCardData | null;
  onClose: () => void;
}

export default function OutfitDetailModal({ open, data, onClose }: OutfitDetailModalProps) {
  const router = useRouter();
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const schemeId = useMemo(() => data?.schemeId ?? '', [data]);

  if (!open || !data) return null;

  const toggleFavorite = async () => {
    if (!schemeId) {
      setToast('This card cannot be favorited because the scheme id is missing.');
      return;
    }

    setLoadingFavorite(true);
    const response = await fetch('/api/outfit-favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemeId, favorite: !isFavorite }),
    });
    setLoadingFavorite(false);
    if (!response.ok) {
      setToast('Unable to update favorite.');
      return;
    }
    setIsFavorite((prev) => !prev);
    setToast(!isFavorite ? 'Outfit added to favorites.' : 'Outfit removed from favorites.');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-xs font-semibold text-white">
            Close ✕
          </button>
        </div>
        <OutfitCard data={data} variant="default" />
        <OutfitActionBar
          isFavorite={isFavorite}
          loadingFavorite={loadingFavorite}
          onToggleFavorite={toggleFavorite}
          onUseAsInspiration={() => {
            sessionStorage.setItem('sai_scheme_inspiration', JSON.stringify(data));
            router.push('/create-my-scheme?source=inspiration');
            onClose();
          }}
          onViewCreatorProfile={() => {
            router.push(data.creatorId ? `/profile/${data.creatorId}` : '/profile');
            onClose();
          }}
          onOpenDressTester={() => {
            sessionStorage.setItem('sai_dress_tester_payload', JSON.stringify(data));
            router.push('/dress-tester?source=outfit');
            onClose();
          }}
        />
        {toast ? <p className="mt-2 text-xs text-cyan-200">{toast}</p> : null}
      </div>
    </div>
  );
}
