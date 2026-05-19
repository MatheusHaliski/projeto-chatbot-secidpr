'use client';

import { useState } from 'react';
import { OutfitExportRecord, SocialPlatform } from '@/app/components/profile/types';

interface ExportRequest {
  userId: string;
  outfitId: string;
  schemeId?: string;
  platform: SocialPlatform;
  format: 'square' | 'portrait' | 'story';
  exportMode: 'image_only' | 'image_with_caption';
  caption: string;
  sourceImageUrl: string;
}

export function useOutfitExport() {
  const [submitting, setSubmitting] = useState(false);

  const exportOutfit = async (request: ExportRequest): Promise<OutfitExportRecord> => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/outfit-exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unexpected export error' }));
        throw new Error(payload.error || 'Unable to export outfit');
      }

      return (await response.json()) as OutfitExportRecord;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    exportOutfit,
  };
}
