import { OutfitBackgroundConfig } from '@/app/lib/outfit-card';
import { BackgroundStudioStyleConfig } from '@/app/lib/outfit-card';
import {
  GeometryFamily,
  BackgroundPresetId,
  PresetCategory,
  RecommendedPreset,
  OutfitMetadata,
  PresetContext,
  PresetRuntimeState,
  ReferenceIntent,
  CompositionRecipe,
  RepeatedImagePatternOptions,
  MotifSeed,
  CanvasTiledMotifOptions,
} from './types';
import {
  TONAL_GEOMETRY_BACKGROUND_IMAGE,
  NEON_MOTION_GRID_IMAGE,
  DEFAULT_BACKGROUND,
  GEOMETRY_PROMPT_MAP,
  GEOMETRY_NEGATIVE_PROMPT_MAP,
  GEOMETRY_VARIATION_MAP,
  GEOMETRY_TO_SHAPE_LANGUAGE,
  GEOMETRY_TO_BACKGROUND_SHAPE,
} from './constants';

export const asDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export function escapeSvgAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&apos;');
}

export function getRelativeLuminance(hexColor: string) {
  const safeColor = /^#([0-9A-F]{6})$/i.test(hexColor) ? hexColor : '#111827';
  const rgb = [
    parseInt(safeColor.slice(1, 3), 16),
    parseInt(safeColor.slice(3, 5), 16),
    parseInt(safeColor.slice(5, 7), 16),
  ].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function detectGeometryFromPrompt(prompt: string): GeometryFamily | null {
  const normalized = prompt.toLowerCase();
  const entries: Array<{ geometry: GeometryFamily; aliases: string[] }> = [
    { geometry: 'arrows', aliases: ['arrow', 'arrows', 'chevron', 'chevrons'] },
    { geometry: 'waves', aliases: ['wave', 'waves', 'ripple', 'ripples'] },
    { geometry: 'diamond', aliases: ['diamond', 'rhombus', 'rhombus'] },
    { geometry: 'mesh', aliases: ['mesh', 'lattice', 'net'] },
    { geometry: 'circles', aliases: ['circle', 'circles', 'orbital', 'ring'] },
    { geometry: 'triangles', aliases: ['triangle', 'triangles'] },
    { geometry: 'stars', aliases: ['star', 'stars', 'constellation'] },
    { geometry: 'flowers', aliases: ['flower', 'flowers', 'petal', 'floral'] },
    { geometry: 'beams', aliases: ['beam', 'beams', 'streak', 'streaks'] },
    { geometry: 'panels', aliases: ['panel', 'panels', 'editorial block', 'segmented'] },
    { geometry: 'mixed', aliases: ['mixed', 'hybrid geometry'] },
  ];
  const match = entries.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
  return match?.geometry || null;
}

export function buildGeometryPreviewSvg(geometry: GeometryFamily, baseColor: string) {
  const base = `<rect width='1200' height='800' fill='#0b1120'/><rect width='1200' height='800' fill='${baseColor}' opacity='0.22'/>`;
  const geometryMarkup: Record<GeometryFamily, string> = {
    arrows: Array.from({ length: 8 }).map((_, i) => `<path d='M${70 + i * 140},90 L${190 + i * 140},200 L${70 + i * 140},310' stroke='rgba(248,250,252,0.48)' stroke-width='20' fill='none'/>`).join(''),
    waves: Array.from({ length: 7 }).map((_, i) => `<path d='M-40,${120 + i * 92} C180,${80 + i * 92} 360,${170 + i * 92} 560,${132 + i * 92} C760,${95 + i * 92} 950,${186 + i * 92} 1240,${142 + i * 92}' stroke='rgba(226,232,240,0.45)' stroke-width='12' fill='none'/>`).join(''),
    diamond: Array.from({ length: 6 }).map((_, row) => Array.from({ length: 9 }).map((__, col) => `<path d='M${65 + col * 132},${86 + row * 118} L${118 + col * 132},${142 + row * 118} L${65 + col * 132},${198 + row * 118} L${12 + col * 132},${142 + row * 118} Z' fill='rgba(226,232,240,0.24)'/>`).join('')).join(''),
    mesh: Array.from({ length: 18 }).map((_, i) => `<line x1='${i * 70}' y1='0' x2='${i * 70 + 200}' y2='800' stroke='rgba(148,163,184,0.3)'/>`).join('') + Array.from({ length: 10 }).map((_, i) => `<line x1='0' y1='${i * 90}' x2='1200' y2='${i * 90 + 90}' stroke='rgba(226,232,240,0.24)'/>`).join(''),
    circles: Array.from({ length: 18 }).map((_, i) => `<circle cx='${80 + (i % 6) * 200}' cy='${90 + Math.floor(i / 6) * 220}' r='${32 + (i % 3) * 14}' fill='none' stroke='rgba(226,232,240,0.45)' stroke-width='5'/>`).join(''),
    triangles: Array.from({ length: 7 }).map((_, row) => Array.from({ length: 10 }).map((__, col) => `<path d='M${30 + col * 120},${190 + row * 90} L${90 + col * 120},${70 + row * 90} L${150 + col * 120},${190 + row * 90} Z' fill='rgba(203,213,225,0.3)'/>`).join('')).join(''),
    stars: Array.from({ length: 24 }).map((_, i) => `<path d='M${95 + (i % 8) * 140},${80 + Math.floor(i / 8) * 220} l14,38 h38 l-30,22 10,40 -32,-24 -32,24 10,-40 -30,-22 h38 Z' fill='rgba(248,250,252,0.38)'/>`).join(''),
    flowers: Array.from({ length: 12 }).map((_, i) => `<g transform='translate(${80 + (i % 4) * 280} ${96 + Math.floor(i / 4) * 220})'><circle cx='50' cy='52' r='14' fill='rgba(253,230,138,0.8)'/><ellipse cx='50' cy='24' rx='14' ry='24' fill='rgba(244,114,182,0.48)'/><ellipse cx='78' cy='52' rx='14' ry='24' fill='rgba(244,114,182,0.48)' transform='rotate(90 78 52)'/><ellipse cx='50' cy='80' rx='14' ry='24' fill='rgba(244,114,182,0.48)'/><ellipse cx='22' cy='52' rx='14' ry='24' fill='rgba(244,114,182,0.48)' transform='rotate(90 22 52)'/></g>`).join(''),
    beams: Array.from({ length: 12 }).map((_, i) => `<rect x='${i * 110}' y='0' width='24' height='800' fill='rgba(56,189,248,0.25)' transform='rotate(11 ${i * 110} 0)'/>`).join(''),
    panels: Array.from({ length: 8 }).map((_, i) => `<rect x='${40 + (i % 4) * 280}' y='${70 + Math.floor(i / 4) * 330}' width='240' height='300' rx='24' fill='rgba(226,232,240,0.2)' stroke='rgba(226,232,240,0.42)'/>`).join(''),
    mixed: `<g opacity='0.72'>${Array.from({ length: 8 }).map((_, i) => `<line x1='${i * 150}' y1='0' x2='${i * 150 + 150}' y2='800' stroke='rgba(56,189,248,0.22)'/>`).join('')}${Array.from({ length: 8 }).map((_, i) => `<circle cx='${120 + i * 130}' cy='${220 + ((i % 3) * 120)}' r='26' stroke='rgba(248,250,252,0.42)' fill='none'/>`).join('')}</g>`,
  };
  return asDataUri(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>${base}${geometryMarkup[geometry]}<rect width='1200' height='800' fill='rgba(2,6,23,0.2)'/></svg>`);
}

export function buildGeometryPreviewConfig(geometry: GeometryFamily, heroColor: string): OutfitBackgroundConfig {
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${geometry} deterministic preview`,
      image_url: buildGeometryPreviewSvg(geometry, heroColor),
      generation_status: 'done',
    },
    gradient: {
      type: 'linear',
      angle: 130,
      intensity: 100,
      stops: [{ color: '#0f172a', position: 0 }, { color: heroColor, position: 100 }],
    },
    shape: GEOMETRY_TO_BACKGROUND_SHAPE[geometry],
  };
}

export function createOffscreenCanvas(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function loadImageFromSource(source: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    throw new Error('window_unavailable');
  }
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image_load_failed'));
    image.src = source;
  });
}

export function createReferenceTile(image: HTMLImageElement, tileSize: number, tilePadding: number): HTMLCanvasElement {
  const tileCanvas = createOffscreenCanvas(tileSize, tileSize);
  if (!tileCanvas) throw new Error('canvas_unavailable');
  const tileCtx = tileCanvas.getContext('2d');
  if (!tileCtx) throw new Error('canvas_context_unavailable');
  const contentSize = Math.max(4, tileSize - tilePadding * 2);
  const scale = Math.min(contentSize / image.naturalWidth, contentSize / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (tileSize - drawWidth) / 2;
  const offsetY = (tileSize - drawHeight) / 2;
  tileCtx.clearRect(0, 0, tileSize, tileSize);
  tileCtx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  return tileCanvas;
}

export function renderRepeatedTileGrid(
  ctx: CanvasRenderingContext2D,
  tileCanvas: HTMLCanvasElement,
  options: CanvasTiledMotifOptions,
) {
  const stepX = options.canvasWidth / options.gridColumns;
  const stepY = options.canvasHeight / options.gridRows;
  const baseDrawSize = Math.min(stepX, stepY) * 0.88;
  for (let row = 0; row < options.gridRows; row += 1) {
    for (let col = 0; col < options.gridColumns; col += 1) {
      const seed = row * 157 + col * 89 + 17;
      const scale = 0.94 + seededRandom(seed) * 0.13;
      const localOpacity = options.tileOpacity + seededRandom(seed + 3) * 0.14;
      const offsetX = (seededRandom(seed + 5) - 0.5) * stepX * 0.18;
      const offsetY = (seededRandom(seed + 7) - 0.5) * stepY * 0.18;
      const rotation = (seededRandom(seed + 11) - 0.5) * 0.18;
      const drawSize = baseDrawSize * scale;
      const centerX = stepX * (col + 0.5) + offsetX + (row % 2 ? stepX * 0.08 : 0);
      const centerY = stepY * (row + 0.5) + offsetY;
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, Math.max(0.2, localOpacity));
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.drawImage(tileCanvas, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
  }
}

export async function buildTiledMotifFromReferenceImage(
  referenceImage: string,
  context: PresetContext,
  baseGradient?: OutfitBackgroundConfig['gradient'],
): Promise<OutfitBackgroundConfig> {
  const image = await loadImageFromSource(referenceImage);
  const canvasWidth = 1200;
  const canvasHeight = 800;
  const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
  const gridColumns = ratio > 1.4 ? 6 : ratio < 0.8 ? 5 : 4;
  const gridRows = ratio > 1.4 ? 4 : 5;
  const tileSize = Math.max(120, Math.round(Math.min(canvasWidth / gridColumns, canvasHeight / gridRows) * 0.9));
  const canvas = createOffscreenCanvas(canvasWidth, canvasHeight);
  if (!canvas) throw new Error('canvas_unavailable');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_context_unavailable');
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  const gradientStops = baseGradient?.stops?.length
    ? baseGradient.stops
    : [
        { color: '#020617', position: 0 },
        { color: '#0f172a', position: 50 },
        { color: context.heroColor, position: 100 },
      ];
  gradientStops.forEach((stop) => gradient.addColorStop(Math.min(1, Math.max(0, stop.position / 100)), stop.color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const tileCanvas = createReferenceTile(image, tileSize, Math.round(tileSize * 0.14));
  renderRepeatedTileGrid(ctx, tileCanvas, {
    canvasWidth,
    canvasHeight,
    gridColumns,
    gridRows,
    tileOpacity: 0.34,
  });
  ctx.fillStyle = 'rgba(2,6,23,0.14)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const outputUrl = canvas.toDataURL('image/png');
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${context.brandName} repeated motif surface from uploaded logo via canvas tiled composition`,
      image_url: outputUrl,
      generation_status: 'done',
    },
    shape: 'none',
    texture_overlay: false,
    gradient: {
      type: 'linear',
      angle: 132,
      intensity: 104,
      stops: gradientStops,
    },
  };
}

export function seededRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

export function createRepeatedImagePattern(referenceImage: string, options: RepeatedImagePatternOptions) {
  const stepX = options.motifWidth + options.spacingX;
  const stepY = options.motifHeight + options.spacingY;
  const startX = options.offsetX ?? 24;
  const startY = options.offsetY ?? 24;
  const diagonalShift = Math.round(stepX * 0.32);
  const safeX2 = options.safeArea.x + options.safeArea.width;
  const safeY2 = options.safeArea.y + options.safeArea.height;

  return Array.from({ length: options.rows }).map((_, row) =>
    Array.from({ length: options.columns }).map((__, col) => {
      let x = startX + col * stepX;
      let y = startY + row * stepY;
      if (options.repeatMode === 'staggered' && row % 2 !== 0) x += Math.round(stepX * 0.48);
      if (options.repeatMode === 'diagonal') x += row * diagonalShift;
      if (options.repeatMode === 'scattered-balanced') {
        x += Math.round((seededRandom((row + 2) * 17 + (col + 5) * 29) - 0.5) * (options.spacingX * 0.65));
        y += Math.round((seededRandom((row + 11) * 31 + (col + 7) * 13) - 0.5) * (options.spacingY * 0.65));
      }

      const variationSeed = row * 97 + col * 53 + options.columns * 11;
      const scale = options.minScale + seededRandom(variationSeed + 1) * (options.maxScale - options.minScale);
      const opacity = options.minOpacity + seededRandom(variationSeed + 2) * (options.maxOpacity - options.minOpacity);
      const rotation = (seededRandom(variationSeed + 3) * 2 - 1) * options.maxRotationDeg;
      const motifW = Math.round(options.motifWidth * scale);
      const motifH = Math.round(options.motifHeight * scale);
      const motifX = Math.round(x - (motifW - options.motifWidth) / 2);
      const motifY = Math.round(y - (motifH - options.motifHeight) / 2);
      const centerX = motifX + motifW / 2;
      const centerY = motifY + motifH / 2;
      const inSafeArea = centerX >= options.safeArea.x && centerX <= safeX2 && centerY >= options.safeArea.y && centerY <= safeY2;
      const safeAreaOpacity = inSafeArea ? 0.35 : 1;

      return `<g transform='translate(${centerX} ${centerY}) rotate(${rotation.toFixed(2)}) translate(${-centerX} ${-centerY})' opacity='${(opacity * safeAreaOpacity).toFixed(3)}'>
        <image href='${referenceImage}' x='${motifX}' y='${motifY}' width='${motifW}' height='${motifH}' preserveAspectRatio='xMidYMid meet'/>
      </g>`;
    }).join('')
  ).join('');
}

export function extractMotifSeed(referenceImage: string, context: PresetContext, imageAspectRatio = 1): MotifSeed {
  return {
    source: referenceImage,
    aspectRatio: Number.isFinite(imageAspectRatio) && imageAspectRatio > 0 ? imageAspectRatio : 1,
    dominantColor: context.heroColor,
    brandName: context.brandName,
  };
}

export function generateRepeatedPattern(motifSeed: MotifSeed, repeatMode: RepeatedImagePatternOptions['repeatMode']) {
  const safeAspectRatio = motifSeed.aspectRatio;
  const motifScale: 'tiny' | 'small' | 'medium' = safeAspectRatio > 1.8 ? 'tiny' : safeAspectRatio < 0.7 ? 'medium' : 'small';
  const density: 'low' | 'medium' | 'high' = 'high';
  const motifHeightByScale = { tiny: 54, small: 68, medium: 84 } as const;
  const densityRows = { low: 6, medium: 7, high: 9 } as const;
  const densityCols = { low: 10, medium: 12, high: 15 } as const;
  const motifHeight = motifHeightByScale[motifScale];
  const motifWidth = Math.round(Math.min(138, Math.max(40, motifHeight * safeAspectRatio)));
  return createRepeatedImagePattern(motifSeed.source, {
    motifWidth,
    motifHeight,
    spacingX: 16,
    spacingY: 18,
    columns: densityCols[density],
    rows: densityRows[density],
    canvasWidth: 1200,
    canvasHeight: 800,
    repeatMode,
    minScale: 0.92,
    maxScale: 1.08,
    minOpacity: 0.26,
    maxOpacity: 0.52,
    maxRotationDeg: 7,
    safeArea: { x: 110, y: 90, width: 550, height: 360 },
    offsetX: 16,
    offsetY: 20,
  });
}

export function compositeMotifSurface(
  motifSeed: MotifSeed,
  repeatedPattern: string,
  repeatMode: RepeatedImagePatternOptions['repeatMode'],
  baseGradient?: OutfitBackgroundConfig['gradient'],
) {
  const gradientStops = baseGradient?.stops?.length
    ? baseGradient.stops
    : [
        { color: '#020617', position: 0 },
        { color: '#0f172a', position: 50 },
        { color: motifSeed.dominantColor, position: 100 },
      ];
  const stopMarkup = gradientStops.map((stop) => (
    `<stop offset='${Math.min(100, Math.max(0, stop.position))}%' stop-color='${stop.color}'/>`
  )).join('');
  return asDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <linearGradient id='surface' x1='0%' y1='0%' x2='100%' y2='100%'>
          ${stopMarkup}
        </linearGradient>
        <radialGradient id='safeAreaMask' cx='30%' cy='28%' r='42%'>
          <stop offset='0%' stop-color='rgba(15,23,42,0.70)'/>
          <stop offset='75%' stop-color='rgba(15,23,42,0.22)'/>
          <stop offset='100%' stop-color='rgba(15,23,42,0)'/>
        </radialGradient>
        <pattern id='microGrid' width='20' height='20' patternUnits='userSpaceOnUse'>
          <path d='M20 0H0V20' fill='none' stroke='rgba(148,163,184,0.08)' stroke-width='1'/>
        </pattern>
        <filter id='softShadow' x='-12%' y='-12%' width='124%' height='124%'>
          <feGaussianBlur stdDeviation='2.8'/>
        </filter>
      </defs>
      <rect width='1200' height='800' fill='url(#surface)'/>
      <rect width='1200' height='800' fill='url(#microGrid)'/>
      <rect width='1200' height='800' fill='rgba(248,250,252,0.03)'/>
      <g filter='url(#softShadow)' opacity='0.28'>
        ${repeatedPattern}
      </g>
      ${repeatedPattern}
      <rect x='60' y='60' width='610' height='390' rx='44' fill='url(#safeAreaMask)'/>
      <rect width='1200' height='800' fill='rgba(2,6,23,0.12)'/>
      <text x='66' y='760' font-size='22' font-family='Inter, Arial, sans-serif' fill='rgba(148,163,184,0.55)' letter-spacing='3'>${escapeSvgAttribute(motifSeed.brandName.toUpperCase())} MOTIF SURFACE · ${repeatMode.toUpperCase()}</text>
    </svg>`,
  );
}

export function buildTiledMotifFromReference(
  referenceImage: string,
  context: PresetContext,
  imageAspectRatio = 1,
  baseGradient?: OutfitBackgroundConfig['gradient'],
): OutfitBackgroundConfig {
  const motifSeed = extractMotifSeed(referenceImage, context, imageAspectRatio);
  const repeatModes: RepeatedImagePatternOptions['repeatMode'][] = ['grid', 'staggered', 'diagonal', 'scattered-balanced'];
  const repeatMode = repeatModes[Math.abs(context.brandName.length) % repeatModes.length];
  const repeatedPattern = generateRepeatedPattern(motifSeed, repeatMode);
  const tiledBrandSurface = compositeMotifSurface(motifSeed, repeatedPattern, repeatMode, baseGradient);
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${context.brandName} repeated motif surface from uploaded logo, ${repeatMode} layout, premium editorial texture`,
      image_url: tiledBrandSurface,
      generation_status: 'done',
    },
    shape: 'none',
    texture_overlay: false,
    gradient: {
      type: 'linear',
      angle: 132,
      intensity: 104,
      stops: [
        { color: '#020617', position: 0 },
        { color: '#0f172a', position: 50 },
        { color: context.heroColor, position: 100 },
      ],
    },
  };
}

export function buildEditorialLogoComposition(referenceImage: string, context: PresetContext): OutfitBackgroundConfig {
  const safeBrand = escapeSvgAttribute(context.brandName);
  const editorialLogoField = asDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <filter id='softShadow' x='-18%' y='-18%' width='136%' height='136%'>
          <feGaussianBlur stdDeviation='10'/>
        </filter>
      </defs>
      <rect width='1200' height='800' fill='#ffffff'/>
      <image href='${TONAL_GEOMETRY_BACKGROUND_IMAGE}' x='0' y='0' width='1200' height='800' preserveAspectRatio='xMidYMid slice' opacity='0.34'/>
      <rect width='1200' height='800' fill='rgba(255,255,255,0.54)'/>
      <g transform='translate(726 140)' filter='url(#softShadow)'>
        <rect x='0' y='0' width='332' height='486' rx='32' fill='rgba(255,255,255,0.90)'/>
        <rect x='18' y='18' width='296' height='450' rx='24' fill='rgba(148,163,184,0.10)'/>
        <image href='${referenceImage}' x='32' y='34' width='268' height='392' preserveAspectRatio='xMidYMid meet' opacity='0.94'/>
        <rect x='72' y='442' width='188' height='18' rx='9' fill='rgba(15,23,42,0.20)'/>
      </g>
      <text x='88' y='120' font-size='54' font-family='Arial Black, Arial, sans-serif' fill='rgba(15,23,42,0.30)'>${safeBrand}</text>
    </svg>`,
  );
  return {
    background_mode: 'ai_artwork',
    ai_artwork: { prompt: `${context.brandName} editorial logo composition from uploaded reference`, image_url: editorialLogoField, generation_status: 'done' },
    gradient: {
      type: 'linear',
      angle: 135,
      intensity: 100,
      stops: [{ color: '#ffffff', position: 0 }, { color: '#ffffff', position: 100 }],
    },
    shape: 'none',
  };
}

export function analyzeReferenceIntent(referenceImage?: string | null): ReferenceIntent {
  if (!referenceImage) return 'logo_pure';
  if (referenceImage.includes('logo') || referenceImage.includes('brand')) return 'logo_pure';
  if (referenceImage.includes('pattern') || referenceImage.includes('fabric')) return 'fabric_pattern';
  if (referenceImage.includes('product')) return 'product_photo';
  if (referenceImage.includes('editorial') || referenceImage.includes('campaign')) return 'editorial_image';
  if (referenceImage.includes('texture')) return 'symbol_texture';
  return 'abstract_image';
}

export function extractPrimaryVisualSubject(referenceImage?: string | null) {
  if (!referenceImage) return 'brand_mark';
  if (referenceImage.includes('data:image/')) return 'uploaded_symbol';
  if (referenceImage.includes('blob:')) return 'uploaded_photo';
  return 'asset_subject';
}

export function detectLogoLikeSubject(referenceImage?: string | null) {
  const subject = extractPrimaryVisualSubject(referenceImage);
  const intent = analyzeReferenceIntent(referenceImage);
  return subject === 'uploaded_symbol' || intent === 'logo_pure' || intent === 'logo_with_background';
}

export function buildCompositionRecipe(input: {
  presetId: BackgroundPresetId;
  referenceIntent: ReferenceIntent;
  gradient?: OutfitBackgroundConfig['gradient'];
}): CompositionRecipe {
  const common = {
    colorStory: input.gradient?.stops?.map((stop) => stop.color).join(' → ') || 'selection-premium',
    motifDensity: 'medium' as const,
    logoWeight: input.referenceIntent === 'logo_pure' ? 0.9 : 0.7,
    imageWeight: input.referenceIntent === 'editorial_image' ? 0.9 : 0.65,
    geometryWeight: 0.45,
    glowWeight: 0.3,
    safeAreaBias: 'high' as const,
  };
  const recipeByPreset: Record<BackgroundPresetId, CompositionRecipe> = {
    selection_tiled_motif: { ...common, presetId: input.presetId, compositionMode: 'pattern', motifDensity: 'high', repeatMode: 'staggered', geometryWeight: 0.3, glowWeight: 0.2 },
    selection_editorial_logo: { ...common, presetId: input.presetId, compositionMode: 'hero', motifDensity: 'low', repeatMode: 'grid', logoWeight: 0.98, imageWeight: 0.35 },
    selection_tonal_geometry: { ...common, presetId: input.presetId, compositionMode: 'editorial', motifDensity: 'medium', repeatMode: 'diagonal', geometryWeight: 0.8 },
    selection_logo_image_fusion: { ...common, presetId: input.presetId, compositionMode: 'fusion', motifDensity: 'medium', logoWeight: 0.72, imageWeight: 0.88, geometryWeight: 0.6, glowWeight: 0.48 },
    selection_tech_amber_energy: { ...common, presetId: input.presetId, compositionMode: 'tech', motifDensity: 'high', repeatMode: 'diagonal', logoWeight: 0.78, imageWeight: 0.66, geometryWeight: 0.86, glowWeight: 0.82, safeAreaBias: 'medium' },
    selection_metallic_sport_identity: { ...common, presetId: input.presetId, compositionMode: 'tech', motifDensity: 'medium', repeatMode: 'grid', logoWeight: 0.72, imageWeight: 0.62, geometryWeight: 0.76, glowWeight: 0.46 },
    selection_neon_motion_grid: { ...common, presetId: input.presetId, compositionMode: 'tech', motifDensity: 'high', repeatMode: 'diagonal', logoWeight: 0.7, imageWeight: 0.7, geometryWeight: 0.9, glowWeight: 0.88, safeAreaBias: 'medium' },
    selection_luxury_fabric_monogram: { ...common, presetId: input.presetId, compositionMode: 'pattern', motifDensity: 'medium', repeatMode: 'staggered', logoWeight: 0.84, imageWeight: 0.48, geometryWeight: 0.26, glowWeight: 0.14 },
    selection_editorial_collage: { ...common, presetId: input.presetId, compositionMode: 'editorial', motifDensity: 'low', repeatMode: 'grid', logoWeight: 0.66, imageWeight: 0.92, geometryWeight: 0.52, glowWeight: 0.4 },
    selection_soft_premium_minimal: { ...common, presetId: input.presetId, compositionMode: 'minimal', motifDensity: 'low', repeatMode: 'grid', logoWeight: 0.56, imageWeight: 0.35, geometryWeight: 0.2, glowWeight: 0.08 },
  };
  return recipeByPreset[input.presetId];
}

export function buildTonalGeometryConfig(context: PresetContext, referenceImage?: string | null): OutfitBackgroundConfig {
  const tonalReferenceImage = referenceImage || context.brandLogoUrl || null;
  const composedTonalGeometry = tonalReferenceImage
    ? asDataUri(
        `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
          <rect width='1200' height='800' fill='#0f172a'/>
          <image href='${TONAL_GEOMETRY_BACKGROUND_IMAGE}' x='0' y='0' width='1200' height='800' preserveAspectRatio='xMidYMid slice'/>
          <rect width='1200' height='800' fill='rgba(15,23,42,0.28)'/>
          <g transform='translate(710 128)'>
            <rect x='0' y='0' width='368' height='508' rx='38' fill='rgba(15,23,42,0.42)'/>
            <rect x='16' y='16' width='336' height='476' rx='28' fill='rgba(226,232,240,0.08)'/>
            <image href='${tonalReferenceImage}' x='28' y='32' width='312' height='438' preserveAspectRatio='xMidYMid slice' opacity='0.9'/>
          </g>
          <path d='M0,540 C240,500 430,630 680,578 C850,542 980,462 1200,384 V800 H0 Z' fill='rgba(15,23,42,0.28)'/>
        </svg>`,
      )
    : TONAL_GEOMETRY_BACKGROUND_IMAGE;
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${context.brandName} selection tonal geometry premium surface`,
      image_url: composedTonalGeometry,
      generation_status: 'done',
    },
    gradient: {
      type: 'linear',
      angle: 130,
      intensity: 102,
      stops: [
        { color: '#1e293b', position: 0 },
        { color: '#334155', position: 52 },
        { color: '#64748b', position: 100 },
      ],
    },
    shape: 'none',
    studioStyleConfig: {
      presetId: 'selection_tonal_geometry',
      family: 'geometry',
      styleMode: 'tonal_geometry_image_base',
      material: 'tonal_panel',
      paletteMode: 'cool_luxury',
      referenceImageUrl: tonalReferenceImage,
      metadata: {
        backgroundImageSrc: TONAL_GEOMETRY_BACKGROUND_IMAGE,
        composedWithReferenceImage: Boolean(tonalReferenceImage),
      },
    },
  };
}

export function buildTechAmberEnergyConfig(context: PresetContext, referenceImage?: string | null): OutfitBackgroundConfig {
  const safeReferenceImage = referenceImage || context.brandLogoUrl || '';
  const amberSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
    <defs>
      <linearGradient id='amberPremium' x1='4%' y1='8%' x2='96%' y2='92%'>
        <stop offset='0%' stop-color='#2b1606'/>
        <stop offset='35%' stop-color='#8a4b0f'/>
        <stop offset='68%' stop-color='#f59e0b'/>
        <stop offset='100%' stop-color='#fde68a'/>
      </linearGradient>
      <filter id='amberGlow'>
        <feGaussianBlur stdDeviation='8'/>
      </filter>
    </defs>
    <rect width='1200' height='800' fill='url(#amberPremium)'/>
    <rect width='1200' height='800' fill='rgba(17,24,39,0.24)'/>
    <g stroke='rgba(253,230,138,0.34)' stroke-width='1.8'>
      ${Array.from({ length: 12 }).map((_, i) => `<line x1='${i * 115}' y1='-20' x2='${i * 115 + 240}' y2='820'/>`).join('')}
    </g>
    <circle cx='340' cy='260' r='188' fill='rgba(251,191,36,0.36)' filter='url(#amberGlow)'/>
    ${safeReferenceImage ? `<image href='${safeReferenceImage}' x='760' y='132' width='308' height='436' opacity='0.92' preserveAspectRatio='xMidYMid slice'/>` : ''}
    ${safeReferenceImage ? `<rect x='736' y='108' width='356' height='486' rx='36' fill='none' stroke='rgba(254,243,199,0.62)' stroke-width='3'/>` : ''}
    <text x='82' y='712' font-size='54' fill='rgba(17,24,39,0.74)' font-family='Arial Black,Arial,sans-serif'>${escapeSvgAttribute(context.brandName)} · TECH AMBER ENERGY</text>
  </svg>`;
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${context.brandName} amber energy premium tech treatment`,
      image_url: asDataUri(amberSvg),
      generation_status: 'done',
    },
    gradient: {
      type: 'linear',
      angle: 128,
      intensity: 108,
      stops: [
        { color: '#2b1606', position: 0 },
        { color: '#8a4b0f', position: 40 },
        { color: '#f59e0b', position: 76 },
        { color: '#fde68a', position: 100 },
      ],
    },
    shape: 'none',
  };
}

export function buildTonalGeometryPreset(context: PresetContext, referenceImage?: string | null): OutfitBackgroundConfig {
  return buildTonalGeometryConfig(context, referenceImage);
}

export function buildLuxuryFabricMonogramPreset(context: PresetContext, referenceImage?: string | null): OutfitBackgroundConfig {
  const safeReferenceImage = referenceImage || context.brandLogoUrl || null;
  const monogramRaw = context.brandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0] || '')
    .join('')
    .toUpperCase() || 'SL';
  const monogram = escapeSvgAttribute(monogramRaw);
  const composedMonogram = asDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <pattern id='mono' width='220' height='180' patternUnits='userSpaceOnUse'>
          <rect width='220' height='180' fill='rgba(8,47,73,0)'/>
          <text x='26' y='122' font-size='82' letter-spacing='5' font-family='Times New Roman, Georgia, serif' fill='rgba(191,219,254,0.2)'>${monogram}</text>
          <path d='M20 28 H200 M20 154 H200' stroke='rgba(186,230,253,0.18)' stroke-width='1.8'/>
        </pattern>
        <linearGradient id='fabricBase' x1='6%' y1='8%' x2='94%' y2='92%'>
          <stop offset='0%' stop-color='#0f172a'/>
          <stop offset='52%' stop-color='#1e3a8a'/>
          <stop offset='100%' stop-color='#0c4a6e'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='800' fill='url(#fabricBase)'/>
      <rect width='1200' height='800' fill='url(#mono)'/>
      <rect width='1200' height='800' fill='rgba(15,23,42,0.24)'/>
      <path d='M0,610 C220,548 470,676 780,610 C960,568 1080,496 1200,430 V800 H0 Z' fill='rgba(2,6,23,0.34)'/>
      ${safeReferenceImage ? `<image href='${safeReferenceImage}' x='780' y='148' width='292' height='404' preserveAspectRatio='xMidYMid meet' opacity='0.86'/>` : ''}
      ${safeReferenceImage ? `<rect x='760' y='126' width='334' height='446' rx='34' fill='none' stroke='rgba(191,219,254,0.5)' stroke-width='2.5'/>` : ''}
      <text x='80' y='718' font-size='56' fill='rgba(219,234,254,0.82)' font-family='Arial Black,Arial,sans-serif'>${escapeSvgAttribute(context.brandName)} MONOGRAM</text>
    </svg>`,
  );
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${context.brandName} luxury fabric monogram branded surface`,
      image_url: composedMonogram,
      generation_status: 'done',
    },
    gradient: {
      type: 'linear',
      angle: 132,
      intensity: 104,
      stops: [
        { color: '#0f172a', position: 0 },
        { color: '#1e3a8a', position: 56 },
        { color: '#0c4a6e', position: 100 },
      ],
    },
    shape: 'mesh',
    studioStyleConfig: {
      presetId: 'selection_luxury_fabric_monogram',
      family: 'pattern_surface',
      styleMode: 'luxury_fabric_monogram',
      material: 'premium_fabric',
      paletteMode: 'cool_luxury',
      referenceImageUrl: safeReferenceImage,
      metadata: {
        monogram,
      },
    },
  };
}

export function buildNeonMotionGridConfig(context: PresetContext, referenceImage?: string | null): OutfitBackgroundConfig {
  const safeReferenceImage = referenceImage || context.brandLogoUrl || '';
  const composedNeonGrid = asDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <rect width='1200' height='800' fill='#020617'/>
      <image href='${NEON_MOTION_GRID_IMAGE}' x='0' y='0' width='1200' height='800' preserveAspectRatio='xMidYMid slice'/>
      <rect width='1200' height='800' fill='rgba(15,23,42,0.22)'/>
      <path d='M0,620 C220,540 460,690 760,598 C930,546 1090,458 1200,396 V800 H0 Z' fill='rgba(2,6,23,0.36)'/>
      ${safeReferenceImage ? `<image href='${safeReferenceImage}' x='760' y='140' width='316' height='420' preserveAspectRatio='xMidYMid slice' opacity='0.9'/>` : ''}
      ${safeReferenceImage ? `<rect x='738' y='116' width='360' height='466' rx='36' fill='none' stroke='rgba(56,189,248,0.5)' stroke-width='2.5'/>` : ''}
    </svg>`,
  );
  return {
    background_mode: 'ai_artwork',
    ai_artwork: {
      prompt: `${context.brandName} neon motion grid premium tech rhythm`,
      image_url: composedNeonGrid,
      generation_status: 'done',
    },
    gradient: {
      type: 'linear',
      angle: 132,
      intensity: 100,
      stops: [
        { color: '#020617', position: 0 },
        { color: '#0f172a', position: 58 },
        { color: '#1d4ed8', position: 100 },
      ],
    },
    shape: 'none',
  };
}

export function buildSurfaceFromRecipe(
  recipe: CompositionRecipe,
  context: PresetContext,
  referenceImage?: string | null,
): OutfitBackgroundConfig {
  const brand = escapeSvgAttribute(context.brandName);
  const commonGradient = {
    type: 'linear' as const,
    angle: 130,
    intensity: 105,
    stops: [{ color: '#0b1120', position: 0 }, { color: context.heroColor, position: 54 }, { color: '#f8fafc', position: 100 }],
  };
  const buildImageSurface = (
    svg: string,
    shape: NonNullable<OutfitBackgroundConfig['shape']> = 'mesh',
    studioStyleConfig?: BackgroundStudioStyleConfig,
  ): OutfitBackgroundConfig => ({
    background_mode: 'ai_artwork',
    ai_artwork: { prompt: `${context.brandName} ${recipe.presetId} composition`, image_url: asDataUri(svg), generation_status: 'done' },
    gradient: commonGradient,
    shape,
    studioStyleConfig,
  });
  const safeReferenceImage = referenceImage || context.brandLogoUrl || null;
  if (recipe.presetId === 'selection_tiled_motif' && safeReferenceImage) return buildTiledMotifFromReference(safeReferenceImage, context, 1, commonGradient);
  if (recipe.presetId === 'selection_editorial_logo' && safeReferenceImage) return buildEditorialLogoComposition(safeReferenceImage, context);
  if (recipe.presetId === 'selection_tonal_geometry') {
    return buildTonalGeometryPreset(context, safeReferenceImage);
  }
  if (recipe.presetId === 'selection_luxury_fabric_monogram') {
    return buildLuxuryFabricMonogramPreset(context, safeReferenceImage);
  }
  if (recipe.presetId === 'selection_soft_premium_minimal') {
    // TODO: evolve this preset into physically based brushed-metal rendering once premium texture generator is available.
    console.info('[background-studio] applying soft premium minimal', { presetId: recipe.presetId, hasReferenceImage: Boolean(safeReferenceImage) });
    const goldenSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <linearGradient id='goldBase' x1='0%' y1='10%' x2='100%' y2='90%'>
          <stop offset='0%' stop-color='#f6ead1'/>
          <stop offset='44%' stop-color='#e6c894'/>
          <stop offset='100%' stop-color='#b98754'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='800' fill='url(#goldBase)'/>
      <path d='M-20,560 C260,510 560,620 880,560 C1030,532 1140,474 1220,430 V800 H-20 Z' fill='rgba(121,72,34,0.16)'/>
      ${Array.from({ length: 10 }).map((_, i) => `<line x1='0' y1='${96 + i * 54}' x2='1200' y2='${96 + i * 54}' stroke='rgba(255,252,244,0.13)' stroke-width='1'/>`).join('')}
      <rect width='1200' height='800' fill='rgba(17,12,8,0.06)'/>
    </svg>`;
    return buildImageSurface(goldenSvg, 'none', {
      presetId: 'selection_soft_premium_minimal',
      family: 'minimal_luxury',
      styleMode: 'golden_minimal',
      material: 'soft_metallic_gradient',
      paletteMode: 'authview_gold',
      referenceImageUrl: safeReferenceImage,
      overlays: [
        { type: 'gradient_sweep', opacity: 0.2, density: 'minimal', blendMode: 'soft-light' },
        { type: 'linework', opacity: 0.12, density: 'minimal', blendMode: 'overlay' },
      ],
      metadata: {
        linework: 'refined_horizontal',
        glowIntensity: 0.05,
        blurStrength: 0.08,
        density: 'minimal',
      },
    });
  }

  const generators: Partial<Record<BackgroundPresetId, () => OutfitBackgroundConfig>> = {
    selection_logo_image_fusion: () => buildImageSurface(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='1200' height='800' fill='#020617'/><image href='${safeReferenceImage || ''}' x='0' y='0' width='1200' height='800' preserveAspectRatio='xMidYMid slice' opacity='0.58'/><path d='M0,640 C250,560 520,730 860,620 C1030,565 1130,500 1200,440 V800 H0 Z' fill='rgba(15,23,42,0.64)'/><image href='${safeReferenceImage || ''}' x='730' y='120' width='350' height='430' preserveAspectRatio='xMidYMid meet' opacity='0.88'/><text x='90' y='690' font-size='74' font-family='Arial Black,Arial,sans-serif' fill='rgba(255,255,255,0.86)'>${brand}</text></svg>`, 'orb'),
    selection_tech_amber_energy: () => buildTechAmberEnergyConfig(context, safeReferenceImage),
    selection_metallic_sport_identity: () => buildImageSurface(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><defs><linearGradient id='metal' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#020617'/><stop offset='42%' stop-color='#374151'/><stop offset='100%' stop-color='#cbd5e1'/></linearGradient></defs><rect width='1200' height='800' fill='url(#metal)'/><path d='M0,560 L1200,190 L1200,380 L0,760 Z' fill='rgba(148,163,184,0.24)'/><image href='${safeReferenceImage || ''}' x='100' y='120' width='420' height='420' opacity='0.22' preserveAspectRatio='xMidYMid meet'/><image href='${safeReferenceImage || ''}' x='760' y='170' width='330' height='330' opacity='0.92' preserveAspectRatio='xMidYMid meet'/><rect x='742' y='150' width='366' height='366' rx='34' fill='none' stroke='rgba(226,232,240,0.62)' stroke-width='4'/><text x='84' y='716' font-size='52' fill='rgba(248,250,252,0.8)' font-family='Arial Black,Arial,sans-serif'>METALLIC SPORT IDENTITY</text></svg>`, 'diamond'),
    selection_neon_motion_grid: () => buildNeonMotionGridConfig(context, safeReferenceImage),
    selection_luxury_fabric_monogram: () => buildImageSurface(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='1200' height='800' fill='#1f2937'/></svg>`, 'none'),
    selection_editorial_collage: () => buildImageSurface(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='1200' height='800' fill='#111827'/><image href='${safeReferenceImage || ''}' x='0' y='0' width='620' height='800' opacity='0.66' preserveAspectRatio='xMidYMid slice'/><image href='${safeReferenceImage || ''}' x='540' y='110' width='610' height='540' opacity='0.84' preserveAspectRatio='xMidYMid slice'/><rect x='520' y='90' width='640' height='570' fill='none' stroke='rgba(248,250,252,0.32)' stroke-width='3'/><text x='560' y='706' font-size='58' fill='rgba(248,250,252,0.9)' font-family='Arial Black,Arial,sans-serif'>EDITORIAL COLLAGE</text></svg>`, 'mesh'),
    selection_soft_premium_minimal: () => buildImageSurface(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='1200' height='800' fill='#e2c28c'/></svg>`, 'none'),
  };
  const generator = generators[recipe.presetId];
  if (generator) return generator();
  return buildImageSurface(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='1200' height='800' fill='#0f172a'/><text x='80' y='700' font-size='52' fill='rgba(248,250,252,0.8)' font-family='Arial Black,Arial,sans-serif'>${brand}</text></svg>`,
    'none',
  );
}

export function getPresetAvailabilityReason(
  presetId: BackgroundPresetId,
  context: PresetContext,
  referenceImage?: string | null,
): string | null {
  const hasReferenceImage = Boolean(referenceImage);
  const hasLogo = Boolean(context.brandLogoUrl);
  if (presetId === 'selection_tiled_motif' && !hasReferenceImage) return 'Requires image';
  if (presetId === 'selection_logo_image_fusion' && !hasReferenceImage) return 'Requires image';
  if (presetId === 'selection_editorial_logo' && !hasReferenceImage && !hasLogo) return 'Requires logo or image';
  return null;
}

export function isPresetAvailable(
  presetId: BackgroundPresetId,
  context: PresetContext,
  referenceImage?: string | null,
): boolean {
  return getPresetAvailabilityReason(presetId, context, referenceImage) === null;
}

export function applyPresetPreview(params: {
  presetId: BackgroundPresetId;
  context: PresetContext;
  referenceImage?: string | null;
  gradient?: OutfitBackgroundConfig['gradient'];
}): OutfitBackgroundConfig {
  const safeReferenceImage = params.referenceImage || params.context.brandLogoUrl || null;
  let recipe = buildCompositionRecipe({
    presetId: params.presetId,
    referenceIntent: analyzeReferenceIntent(safeReferenceImage),
    gradient: params.gradient,
  });
  if (detectLogoLikeSubject(safeReferenceImage)) {
    recipe = { ...recipe, logoWeight: Math.min(1, recipe.logoWeight + 0.08) };
  }
  return params.presetId === 'selection_tiled_motif' && safeReferenceImage
    ? buildTiledMotifFromReference(safeReferenceImage, params.context, 1, params.gradient)
    : buildSurfaceFromRecipe(recipe, params.context, safeReferenceImage);
}

export async function applyPresetUnified(params: {
  presetId: BackgroundPresetId;
  context: PresetContext;
  referenceImage?: string | null;
  gradient?: OutfitBackgroundConfig['gradient'];
}): Promise<OutfitBackgroundConfig> {
  const availabilityReason = getPresetAvailabilityReason(params.presetId, params.context, params.referenceImage);
  if (availabilityReason) throw new Error(availabilityReason);
  const safeReferenceImage = params.referenceImage || params.context.brandLogoUrl || null;
  let recipe = buildCompositionRecipe({
    presetId: params.presetId,
    referenceIntent: analyzeReferenceIntent(safeReferenceImage),
    gradient: params.gradient,
  });
  if (detectLogoLikeSubject(safeReferenceImage)) {
    recipe = { ...recipe, logoWeight: Math.min(1, recipe.logoWeight + 0.08) };
  }
  console.log('[Preset Apply]', {
    presetId: params.presetId,
    hasReferenceImage: Boolean(params.referenceImage),
    hasLogo: Boolean(params.context.brandLogoUrl),
    recipe,
  });
  const config = params.presetId === 'selection_tiled_motif' && safeReferenceImage
    ? await buildTiledMotifFromReferenceImage(safeReferenceImage, params.context, params.gradient)
    : buildSurfaceFromRecipe(recipe, params.context, safeReferenceImage);
  return {
    ...config,
    background_mode: config.background_mode || 'ai_artwork',
    gradient: config.gradient || DEFAULT_BACKGROUND.gradient,
    shape: config.shape || 'none',
  };
}

export function getRecommendedPresets(outfitMetadata: OutfitMetadata | undefined, runtimeState: PresetRuntimeState): RecommendedPreset[] {
  const allPresets: RecommendedPreset[] = [
    { id: 'selection_tiled_motif', category: 'pattern_surface', label: 'Selection tiled motif', description: 'Turns the uploaded logo into a repeated premium motif surface.' },
    { id: 'selection_luxury_fabric_monogram', category: 'pattern_surface', label: 'Selection luxury fabric monogram', description: 'Builds a refined fashion surface with repeated branded monogram texture.' },
    { id: 'selection_tonal_geometry', category: 'pattern_surface', label: 'Selection tonal geometry', description: 'Combines tonal palette extraction with subtle geometric paneling.' },
    { id: 'selection_editorial_logo', category: 'editorial_branding', label: 'Selection editorial logo', description: 'Uses the uploaded logo as a hero element in a clean campaign-style composition.' },
    { id: 'selection_editorial_collage', category: 'editorial_branding', label: 'Selection editorial collage', description: 'Fuses cropped logo and treated imagery into a depth-rich editorial card.' },
    { id: 'selection_soft_premium_minimal', category: 'editorial_branding', label: 'Selection soft premium minimal', description: 'Minimal, high-readability premium composition with restrained visual weight.' },
    { id: 'selection_tech_amber_energy', category: 'tech_energy', label: 'Selection tech amber energy', description: 'Fuses uploaded logo with high-energy amber/orange AI-tech visual treatment.' },
    { id: 'selection_neon_motion_grid', category: 'tech_energy', label: 'Selection neon motion grid', description: 'Adds diagonal neon movement, digital grid rhythm, and logo anchoring.' },
    { id: 'selection_metallic_sport_identity', category: 'tech_energy', label: 'Selection metallic sport identity', description: 'Applies silver/graphite highlights for premium sport-tech brand identity.' },
    { id: 'selection_logo_image_fusion', category: 'hybrid_fusion', label: 'Selection logo + stylized image fusion', description: 'Blends uploaded logo with stylized image composition for richer hero surfaces.' },
  ];
  const availablePresetIds = allPresets
    .filter((preset) => {
      if (preset.id === 'selection_tiled_motif') return runtimeState.hasReferenceImage;
      if (preset.id === 'selection_logo_image_fusion') return runtimeState.hasReferenceImage;
      if (preset.id === 'selection_editorial_logo') return runtimeState.hasReferenceImage || runtimeState.hasBrandLogo;
      return true;
    })
    .map((preset) => preset.id);
  const isTechSportDirection = [outfitMetadata?.style, outfitMetadata?.occasion, outfitMetadata?.mood, outfitMetadata?.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .match(/tech|sport|athle|performance|futur|street|active/);

  if (isTechSportDirection) {
    return allPresets
      .filter((preset) => availablePresetIds.includes(preset.id))
      .filter((preset) => ['selection_tonal_geometry', 'selection_tech_amber_energy', 'selection_neon_motion_grid'].includes(preset.id))
      .slice(0, 3);
  }

  const pickFirstByCategory = (category: PresetCategory) => allPresets.find((preset) => preset.category === category && availablePresetIds.includes(preset.id));
  return [
    pickFirstByCategory('pattern_surface'),
    pickFirstByCategory('editorial_branding'),
    pickFirstByCategory('tech_energy'),
  ].filter(Boolean).slice(0, 3) as RecommendedPreset[];
}
