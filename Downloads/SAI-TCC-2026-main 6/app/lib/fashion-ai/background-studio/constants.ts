import { OutfitBackgroundConfig } from '@/app/lib/outfit-card';
import { BackgroundGenerationMode } from '@/app/lib/background-ai';
import {
  ArtworkColorIntent,
  ArtworkContrastLevel,
  ArtworkPaletteMode,
  ArtworkShapeLanguage,
  ArtworkStudioInput,
  ArtworkStylePreset,
} from '@/app/backend/types/artwork-studio';
import { GeometryFamily } from './types';

export const COLOR_SWATCHES = ['#0a0a0a', '#ffffff', '#c0c0c0', '#2e1065', '#047857', '#ddc7a1', '#1d4ed8', '#fff8dc'];

export const GRADIENT_PRESETS: Array<{ label: string; config: OutfitBackgroundConfig }> = [
  {
    label: 'Deep Violet Gradient',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'linear', angle: 135, intensity: 100, stops: [{ color: '#0f172a', position: 0 }, { color: '#6d28d9', position: 100 }] },
      shape: 'orb',
    },
  },
  {
    label: 'Emerald Glow',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'radial', intensity: 110, stops: [{ color: '#022c22', position: 5 }, { color: '#10b981', position: 100 }] },
      shape: 'mesh',
    },
  },
  {
    label: 'Silver Mist',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'linear', angle: 145, intensity: 80, stops: [{ color: '#0f172a', position: 0 }, { color: '#cbd5e1', position: 100 }] },
      shape: 'diamond',
    },
  },
  {
    label: 'Sunset Editorial',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'linear', angle: 150, intensity: 105, stops: [{ color: '#7c2d12', position: 0 }, { color: '#f97316', position: 60 }, { color: '#fde68a', position: 100 }] },
      shape: 'orb',
    },
  },
  {
    label: 'Luxury Warm Fade',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'linear', angle: 125, intensity: 85, stops: [{ color: '#d6c2a5', position: 0 }, { color: '#f7f0e4', position: 100 }] },
      shape: 'none',
    },
  },
  {
    label: 'Blue-to-Green Premium',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'linear', angle: 120, intensity: 105, stops: [{ color: '#1d4ed8', position: 0 }, { color: '#059669', position: 100 }] },
      shape: 'mesh',
    },
  },
  {
    label: 'Night Runway',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'conic', angle: 180, intensity: 100, stops: [{ color: '#020617', position: 0 }, { color: '#0f172a', position: 45 }, { color: '#7e22ce', position: 100 }] },
      shape: 'diamond',
    },
  },
  {
    label: 'Graphite Pulse',
    config: {
      background_mode: 'gradient',
      gradient: { type: 'linear', angle: 110, intensity: 108, stops: [{ color: '#020617', position: 0 }, { color: '#1e293b', position: 52 }, { color: '#334155', position: 100 }] },
      shape: 'mesh',
    },
  },
];

export const SEGMENTED_GRADIENT_OPTIONS = GRADIENT_PRESETS.slice(0, 8);

export const FLOWER_PICKER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
    <rect width='1200' height='800' fill='#e5e7eb'/>
    ${Array.from({ length: 10 }).map((_, row) =>
      Array.from({ length: 14 }).map((__, col) => {
        const x = col * 90 + (row % 2 === 0 ? 0 : 8);
        const y = row * 82 + 6;
        return `<g transform='translate(${x} ${y})'>
          <ellipse cx='40' cy='24' rx='10' ry='17' fill='#b49cf1'/>
          <ellipse cx='53' cy='35' rx='10' ry='17' transform='rotate(50 53 35)' fill='#b49cf1'/>
          <ellipse cx='49' cy='53' rx='10' ry='17' transform='rotate(104 49 53)' fill='#b49cf1'/>
          <ellipse cx='31' cy='53' rx='10' ry='17' transform='rotate(154 31 53)' fill='#b49cf1'/>
          <ellipse cx='27' cy='35' rx='10' ry='17' transform='rotate(206 27 35)' fill='#b49cf1'/>
          <circle cx='40' cy='40' r='8.5' fill='#f7d665'/>
        </g>`;
      }).join('')
    ).join('')}
  </svg>`,
)}`;

export const TONAL_GEOMETRY_BACKGROUND_IMAGE = `/${encodeURIComponent('Sem título (32).png')}`;
export const NEON_MOTION_GRID_IMAGE = '/neongrid.png';

export const CURATED_IMAGE_PICKER_OPTIONS = [
  { fileName: 'Sem título (32).png' },
  { fileName: 'Sem título (33).png' },
  { fileName: 'Sem título (34).png' },
  { fileName: 'Sem título (37).png' },
  { fileName: 'Sem título (36).png' },
  { fileName: 'Sem título (35).png' },
  { fileName: 'Fart.png', label: 'Premium Fashion Artwork' },
  { fileName: 'Sem título (25).png' },
  { fileName: '208445B9-82BD-4AC7-863A-B177A4D187B0_4_5005_c.jpeg', label: 'LEGO Mini Logo' },
  { fileName: '642F71E8-FE96-4345-BB4B-0C4203032B5A.png' },
  { fileName: '6385F3BD-29DE-4841-A3E7-64079EB53F09.png' },
  { fileName: 'newbirds.jpg' },
  { fileName: 'streetvibes.jpg' },
  { fileName: 'flw.jpg' },
  { fileName: 'mfui.jpg' },
].map(({ fileName, label }) => ({
  value: `image:${fileName}`,
  label: label || fileName,
  hint: `Applies ${label || fileName} as artwork surface`,
  imageUrl: `/${encodeURIComponent(fileName)}`,
}));

export const SHAPE_SEGMENT_OPTIONS: Array<NonNullable<OutfitBackgroundConfig['shape']>> = [
  'none',
  'orb',
  'diamond',
  'mesh',
  'stars',
  'circles',
  'triangles',
  'waves',
  'beams',
  'flowers',
  'arrows',
];

export const STYLE_PRESETS: ArtworkStylePreset[] = ['editorial_fashion', 'luxury_minimal', 'futuristic_sport', 'streetwear', 'monochrome_premium'];

export const STYLE_PRESET_DESCRIPTIONS: Record<ArtworkStylePreset, string> = {
  editorial_fashion: 'Creates a campaign/editorial fashion composition',
  luxury_minimal: 'Keeps the card elegant, minimal, and premium',
  futuristic_sport: 'Adds motion, tech energy, and performance-driven styling',
  streetwear: 'Creates a bolder, layered, urban visual direction',
  monochrome_premium: 'Focuses on restrained luxury with a controlled tonal palette',
};

export const PALETTE_MODES: ArtworkPaletteMode[] = ['monochrome', 'cool_luxury', 'warm_neutral', 'custom'];
export const COMPOSITION_TYPES: Array<ArtworkStudioInput['compositionType']> = ['background', 'shape_pack', 'overlay', 'frame'];
export const CONTRAST_LEVELS: ArtworkContrastLevel[] = ['low', 'medium', 'high'];

export const CONTRAST_LEVEL_DESCRIPTIONS: Record<ArtworkContrastLevel, string> = {
  low: 'Soft contrast with subtle transitions',
  medium: 'Balanced contrast for readability and depth',
  high: 'Strong contrast with bold highlights and separation',
};

export const COLOR_INTENTS: Array<{ value: ArtworkColorIntent; label: string }> = [
  { value: 'prompt_driven', label: 'Prompt driven' },
  { value: 'cool_blue', label: 'Cool blue' },
  { value: 'emerald_luxury', label: 'Emerald luxury' },
  { value: 'sunset_warm', label: 'Sunset warm' },
  { value: 'mono_chrome', label: 'Monochrome' },
  { value: 'neon_pop', label: 'Neon pop' },
];

export const AI_GENERATION_MODES: Array<{ value: BackgroundGenerationMode; label: string }> = [
  { value: 'preset_assisted', label: 'Preset Assisted' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'text_prompt_pure', label: 'Text Prompt (Pure AI Mode)' },
];

export const AI_GENERATION_MODE_DESCRIPTIONS: Record<BackgroundGenerationMode, string> = {
  preset_assisted: 'Uses preset logic with AI refinement',
  hybrid: 'Combines preset structure with prompt-driven composition',
  text_prompt_pure: 'Uses the written prompt as the main creative driver',
};

export const GEOMETRY_DESCRIPTION_MAP: Record<GeometryFamily, string> = {
  arrows: 'Directional motifs and chevrons with motion guidance',
  waves: 'Flowing curved bands with elegant rhythm',
  diamond: 'Rhombus-based premium angular patterning',
  mesh: 'Tech lattice or woven net-like geometry',
  circles: 'Orbital circular nodes and ring accents',
  triangles: 'Angular triangular tessellation',
  stars: 'Premium star motifs and constellation accents',
  flowers: 'Decorative floral and petal-based patterning',
  beams: 'Linear streaks and luminous directional bars',
  panels: 'Segmented editorial framing blocks',
  mixed: 'Curated multi-geometry composition',
};

export const GEOMETRY_PROMPT_MAP: Record<GeometryFamily, string> = {
  arrows: 'directional arrows, chevrons, premium sport vector flows, editorial guidance markers',
  waves: 'flowing wave bands, elegant ripple contours, current-like motion lines, layered drapery curves',
  diamond: 'diamond grid, rhombus tessellation, angular luxury pattern blocks',
  mesh: 'tech mesh, woven lattice, net-like geometric structure, performance fabric geometry',
  circles: 'circular nodes, ring clusters, orbital round accents',
  triangles: 'triangular tiling, angular shards, structured tessellation',
  stars: 'star field accents, luxury constellation geometry, refined celestial motifs',
  flowers: 'floral tile repetition, petal motifs, decorative bloom patterning',
  beams: 'light beams, luminous streak bars, directional editorial bars',
  panels: 'segmented editorial panels, magazine-like rectangular framing',
  mixed: 'controlled combination of two or three compatible geometry systems with premium spacing',
};

export const GEOMETRY_NEGATIVE_PROMPT_MAP: Record<GeometryFamily, string> = {
  arrows: 'avoid wave bands, floral curves, soft ripple lines',
  waves: 'avoid arrowheads, rigid chevrons, diamond tiling',
  diamond: 'avoid soft waves, floral petals, random circular blobs',
  mesh: 'avoid floral petals, soft ribbons, starbursts',
  circles: 'avoid chevrons, rigid triangles, diamond tiling',
  triangles: 'avoid rounded ripple bands, floral motifs, circle clusters',
  stars: 'avoid heavy mesh nets, floral petals, rigid chevrons',
  flowers: 'avoid arrows, hard-edged chevrons, rigid grid shards',
  beams: 'avoid floral motifs, wave drapery lines, circular bubble clusters',
  panels: 'avoid organic wave ribbons, floral petals, random star clutter',
  mixed: 'avoid random clutter and incompatible geometry stacking',
};

export const GEOMETRY_VARIATION_MAP: Record<GeometryFamily, string[]> = {
  arrows: ['layered sport arrows', 'angular chevrons', 'editorial directional markers', 'premium velocity vectors'],
  waves: ['soft luxury wave bands', 'rippling contour lines', 'ocean-current fashion curves', 'layered motion drapery lines'],
  diamond: ['monogram-like rhombus pattern', 'luxury diamond tessellation', 'subtle beveled diamond grid', 'sharp editorial diamond structure'],
  mesh: ['metallic mesh', 'woven performance mesh', 'luminous tech lattice', 'sport net geometry'],
  circles: ['orbital ring stacks', 'premium node halos', 'circular pulse clusters', 'editorial radial circles'],
  triangles: ['triangular panel shards', 'premium tessellated facets', 'angular sport triangles', 'structured pyramid tiling'],
  stars: ['constellation clusters', 'premium star trails', 'subtle luxury star accents', 'editorial celestial dots'],
  flowers: ['petal tile repeat', 'fashion bloom surface', 'ornamental floral geometry', 'soft decorative petals'],
  beams: ['diagonal light streaks', 'vertical luminous bars', 'editorial beam framing', 'premium glow beams'],
  panels: ['offset editorial blocks', 'magazine segmentation', 'rectangular framing grids', 'modular premium panels'],
  mixed: ['diamond + beams', 'mesh + circles', 'panels + arrows'],
};

export const GEOMETRY_TO_SHAPE_LANGUAGE: Record<GeometryFamily, ArtworkShapeLanguage> = {
  arrows: 'panels',
  waves: 'orb',
  diamond: 'diamond',
  mesh: 'mesh',
  circles: 'orb',
  triangles: 'diamond',
  stars: 'mixed',
  flowers: 'mixed',
  beams: 'panels',
  panels: 'panels',
  mixed: 'mixed',
};

export const GEOMETRY_TO_BACKGROUND_SHAPE: Record<GeometryFamily, NonNullable<OutfitBackgroundConfig['shape']>> = {
  arrows: 'arrows',
  waves: 'waves',
  diamond: 'diamond',
  mesh: 'mesh',
  circles: 'circles',
  triangles: 'triangles',
  stars: 'stars',
  flowers: 'flowers',
  beams: 'beams',
  panels: 'none',
  mixed: 'none',
};

export const DEFAULT_BACKGROUND: OutfitBackgroundConfig = {
  background_mode: 'gradient',
  gradient: {
    type: 'linear',
    angle: 135,
    intensity: 100,
    stops: [
      { color: '#0f172a', position: 0 },
      { color: '#4c1d95', position: 100 },
    ],
  },
  shape: 'orb',
};
