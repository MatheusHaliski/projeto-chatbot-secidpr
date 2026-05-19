import type { OutfitBackgroundConfig } from '@/app/lib/outfit-card';

export type MaterialType = 'none' | 'embroidered_fabric' | 'lego_material' | 'glass_material' | 'water_material';
export type ThreadDirection = 'diagonal' | 'cross' | 'horizontal' | 'vertical';
export type MaterialFinish = 'matte' | 'satin';
export type MaterialScope = 'card' | 'hero_block' | 'content_block';

export type FabricMaterialConfig = {
  type: MaterialType;
  density: number;
  threadDirection: ThreadDirection;
  threadThickness: number;
  embossIntensity: number;
  stitchBorder: boolean;
  stitchColor: string;
  surfaceContrast: number;
  finish: MaterialFinish;
  scope: MaterialScope;
  premium: boolean;
};

export type MaterialPresetDefinition = {
  id: MaterialType;
  label: string;
  tier: 'standard' | 'premium';
  description: string;
  buildConfig: (baseColor: string) => FabricMaterialConfig;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const resolveNumeric = (value: number | undefined, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(value, min, max);
};

export function buildFabricPresetConfig(baseColor: string, overrides: Partial<FabricMaterialConfig> = {}): FabricMaterialConfig {
  const stitched = overrides.stitchColor || '#1e3a8a';
  const type = overrides.type ?? 'embroidered_fabric';
  return {
    type,
    density: resolveNumeric(overrides.density, 72, 10, 140),
    threadDirection: overrides.threadDirection ?? 'cross',
    threadThickness: resolveNumeric(overrides.threadThickness, 1.8, 0.4, 5),
    embossIntensity: resolveNumeric(overrides.embossIntensity, 42, 0, 100),
    stitchBorder: overrides.stitchBorder ?? true,
    stitchColor: /^#[0-9A-F]{6}$/i.test(stitched) ? stitched : '#1e3a8a',
    surfaceContrast: resolveNumeric(overrides.surfaceContrast, 48, 0, 100),
    finish: overrides.finish ?? 'matte',
    scope: overrides.scope ?? 'card',
    premium: overrides.premium ?? type !== 'none',
  };
}

export const MATERIAL_PRESETS: MaterialPresetDefinition[] = [
  {
    id: 'none',
    label: 'None',
    tier: 'standard',
    description: 'Color and gradient only.',
    buildConfig: () => ({
      type: 'none',
      density: 0,
      threadDirection: 'cross',
      threadThickness: 1,
      embossIntensity: 0,
      stitchBorder: false,
      stitchColor: '#1e3a8a',
      surfaceContrast: 0,
      finish: 'matte',
      scope: 'card',
      premium: false,
    }),
  },
  {
    id: 'embroidered_fabric',
    label: 'Embroidered Fabric / Textile Material',
    tier: 'premium',
    description: 'Premium woven textile with stitched details and soft embossed depth.',
    buildConfig: (baseColor) => buildFabricPresetConfig(baseColor, { type: 'embroidered_fabric', finish: 'matte' }),
  },
  {
    id: 'lego_material',
    label: 'Lego Material',
    tier: 'premium',
    description: 'Chunkier block-like structure with bold thread highlights.',
    buildConfig: (baseColor) => buildFabricPresetConfig(baseColor, {
      type: 'lego_material',
      density: 48,
      threadThickness: 3.2,
      surfaceContrast: 74,
      embossIntensity: 60,
      finish: 'matte',
    }),
  },
  {
    id: 'glass_material',
    label: 'Glass Material',
    tier: 'premium',
    description: 'Translucent textile sheen with satin-like highlights.',
    buildConfig: (baseColor) => buildFabricPresetConfig(baseColor, {
      type: 'glass_material',
      density: 86,
      threadThickness: 0.9,
      surfaceContrast: 38,
      embossIntensity: 24,
      finish: 'satin',
    }),
  },
  {
    id: 'water_material',
    label: 'Water Material',
    tier: 'premium',
    description: 'Fluid directional streaks with deeper tonal movement.',
    buildConfig: (baseColor) => buildFabricPresetConfig(baseColor, {
      type: 'water_material',
      density: 96,
      threadDirection: 'diagonal',
      threadThickness: 1.2,
      surfaceContrast: 66,
      embossIntensity: 34,
      finish: 'satin',
    }),
  },
];

export function applyFabricMaterialToCard(background: OutfitBackgroundConfig, material: FabricMaterialConfig): OutfitBackgroundConfig {
  if (material.type === 'none') {
    return {
      ...background,
      materialLayer: undefined,
      decorativeOverlayLayer: undefined,
    };
  }
  return {
    ...background,
    materialLayer: {
      type: material.type,
      color: background.solid_color || background.gradient?.stops?.[0]?.color || '#374151',
      density: material.density,
      threadDirection: material.threadDirection,
      threadThickness: material.threadThickness,
      embossIntensity: material.embossIntensity,
      surfaceContrast: material.surfaceContrast,
      finish: material.finish,
      scope: material.scope,
      premium: true,
    },
    decorativeOverlayLayer: {
      stitchBorder: material.stitchBorder,
      stitchColor: material.stitchColor,
      opacity: 0.72,
    },
    studioStyleConfig: {
      ...background.studioStyleConfig,
      material: material.type,
      metadata: {
        ...(background.studioStyleConfig?.metadata || {}),
        materialTier: 'premium',
      },
    },
  };
}
