import { OutfitBackgroundConfig } from '@/app/lib/outfit-card';
import { ArtworkAsset } from '@/app/backend/types/artwork-studio';

export type OutfitArtworkApplyMode = 'background' | 'overlay' | 'frame' | 'shape_pack';

export function mapArtworkAssetToCardBackgroundLayer(asset: Pick<ArtworkAsset, 'prompt' | 'output_url'>): OutfitBackgroundConfig {
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: asset.prompt,
      image_url: asset.output_url,
      generation_status: 'done',
    },
    texture_overlay: true,
    shape: 'none',
  };
}

export function mapArtworkAssetToOverlayLayer(asset: Pick<ArtworkAsset, 'prompt' | 'output_url'>): OutfitBackgroundConfig {
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${asset.prompt} (overlay mode)`,
      image_url: asset.output_url,
      generation_status: 'done',
    },
    texture_overlay: true,
    shape: 'mesh',
  };
}

export function applyArtworkToOutfitCard(asset: ArtworkAsset, mode: OutfitArtworkApplyMode): OutfitBackgroundConfig {
  if (mode === 'background') return mapArtworkAssetToCardBackgroundLayer(asset);
  if (mode === 'overlay') return mapArtworkAssetToOverlayLayer(asset);
  if (mode === 'frame') {
    return {
      ...mapArtworkAssetToOverlayLayer(asset),
      shape: 'diamond',
    };
  }

  return {
    ...mapArtworkAssetToOverlayLayer(asset),
    shape: 'orb',
  };
}
