import type { FabricMaterialConfig } from '@/app/lib/materialPresets';
import type { OutfitBackgroundConfig } from '@/app/lib/outfit-card';

type FabricTextureRenderInput = {
  width: number;
  height: number;
  color: string;
  material: FabricMaterialConfig;
};

export type FabricTextureRenderResult = {
  textureDataUrl: string | null;
  decorativeDataUrl: string | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseHex = (hex: string) => {
  const normalized = /^#[0-9A-F]{6}$/i.test(hex) ? hex : '#3f3f46';
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

const tint = (hex: string, delta: number, alpha = 1) => {
  const { r, g, b } = parseHex(hex);
  const next = (channel: number) => clamp(Math.round(channel + delta), 0, 255);
  return `rgba(${next(r)}, ${next(g)}, ${next(b)}, ${alpha})`;
};

function directionToAngle(direction: FabricMaterialConfig['threadDirection']) {
  if (direction === 'horizontal') return 0;
  if (direction === 'vertical') return Math.PI / 2;
  if (direction === 'diagonal') return Math.PI / 4;
  return Math.PI / 4;
}

function drawThreadField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  material: FabricMaterialConfig,
  color: string,
  angle: number,
) {
  const density = clamp(material.density, 10, 140);
  const spacing = Math.max(4, Math.round(26 - density * 0.2));
  const threadLength = Math.max(6, Math.round(spacing * 1.5));
  const thickness = clamp(material.threadThickness, 0.4, 5);
  const emboss = clamp(material.embossIntensity, 0, 100) / 100;

  ctx.lineCap = 'round';
  for (let y = -height; y < height * 2; y += spacing) {
    for (let x = -width; x < width * 2; x += spacing) {
      const jitter = ((x * 13 + y * 7) % 9) - 4;
      const cx = x + jitter;
      const cy = y - jitter * 0.3;
      const dx = Math.cos(angle) * threadLength * 0.5;
      const dy = Math.sin(angle) * threadLength * 0.5;

      ctx.strokeStyle = tint(color, 42, 0.16 + emboss * 0.1);
      ctx.lineWidth = thickness + 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - dx + 0.8, cy - dy + 0.8);
      ctx.lineTo(cx + dx + 0.8, cy + dy + 0.8);
      ctx.stroke();

      ctx.strokeStyle = tint(color, -36, 0.22 + emboss * 0.12);
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
    }
  }
}

function drawLegoField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  material: FabricMaterialConfig,
  color: string,
) {
  const density = clamp(material.density, 10, 140);
  const blockSize = clamp(Math.round(56 - density * 0.22), 22, 54);
  const gap = Math.max(2, Math.round(blockSize * 0.08));
  const emboss = clamp(material.embossIntensity, 0, 100) / 100;

  for (let y = 0; y < height + blockSize; y += blockSize + gap) {
    for (let x = 0; x < width + blockSize; x += blockSize + gap) {
      const jitter = ((x * 17 + y * 11) % 6) - 3;
      const bx = x + jitter * 0.35;
      const by = y + jitter * 0.2;
      const radius = Math.max(4, Math.round(blockSize * 0.15));

      ctx.fillStyle = tint(color, 4 + jitter, 0.92);
      ctx.beginPath();
      ctx.roundRect(bx, by, blockSize, blockSize, radius);
      ctx.fill();

      ctx.strokeStyle = tint(color, -30, 0.32);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(bx + 0.8, by + 0.8, blockSize - 1.6, blockSize - 1.6, radius - 1);
      ctx.stroke();

      ctx.fillStyle = tint(color, 22, 0.34 + emboss * 0.2);
      ctx.fillRect(bx + 2, by + 2, blockSize - 6, Math.max(2, Math.round(blockSize * 0.18)));

      const studRadius = Math.max(3, Math.round(blockSize * 0.14));
      const studOffset = blockSize / 3;
      const studCenters = [
        [bx + studOffset, by + studOffset],
        [bx + blockSize - studOffset, by + studOffset],
        [bx + studOffset, by + blockSize - studOffset],
        [bx + blockSize - studOffset, by + blockSize - studOffset],
      ];
      studCenters.forEach(([cx, cy]) => {
        const gradient = ctx.createRadialGradient(cx - studRadius * 0.35, cy - studRadius * 0.35, 1, cx, cy, studRadius + 1.5);
        gradient.addColorStop(0, tint(color, 38, 0.86));
        gradient.addColorStop(0.55, tint(color, 10, 0.9));
        gradient.addColorStop(1, tint(color, -28, 0.78));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, studRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = tint(color, -45, 0.42);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, studRadius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }
}

function drawWaterField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  material: FabricMaterialConfig,
  color: string,
) {
  const density = clamp(material.density, 10, 140);
  const rippleGap = clamp(Math.round(36 - density * 0.16), 10, 34);
  const emboss = clamp(material.embossIntensity, 0, 100) / 100;

  for (let y = -20; y < height + 20; y += rippleGap) {
    const amplitude = 6 + emboss * 9 + (y % 13) * 0.1;
    const wave = 60 - density * 0.18;
    ctx.strokeStyle = tint(color, 26, 0.22 + emboss * 0.14);
    ctx.lineWidth = 1.8 + emboss * 1.2;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 10) {
      const py = y + Math.sin((x + y * 0.6) / wave) * amplitude;
      if (x === -20) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();

    ctx.strokeStyle = tint(color, -20, 0.16 + emboss * 0.1);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 10) {
      const py = y + rippleGap * 0.35 + Math.sin((x + y) / (wave * 0.85)) * (amplitude * 0.55);
      if (x === -20) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }

  const causticCount = Math.round((width * height) / 18000);
  for (let i = 0; i < causticCount; i += 1) {
    const cx = (i * 73) % width;
    const cy = (i * 97) % height;
    const rx = 18 + (i % 6) * 6;
    const ry = 6 + (i % 4) * 3;
    ctx.strokeStyle = tint(color, 40, 0.12);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, (i % 8) * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGlassField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  material: FabricMaterialConfig,
  color: string,
) {
  const density = clamp(material.density, 10, 140);
  const cellSize = clamp(Math.round(68 - density * 0.22), 22, 72);
  const emboss = clamp(material.embossIntensity, 0, 100) / 100;

  for (let y = 0; y < height + cellSize; y += cellSize) {
    for (let x = 0; x < width + cellSize; x += cellSize) {
      const jitter = ((x * 5 + y * 3) % 7) - 3;
      const paneX = x + jitter * 0.5;
      const paneY = y - jitter * 0.35;
      const paneW = cellSize + (jitter % 2) * 2;
      const paneH = cellSize - (jitter % 3);
      const radius = Math.max(4, Math.round(cellSize * 0.14));

      const paneGradient = ctx.createLinearGradient(paneX, paneY, paneX + paneW, paneY + paneH);
      paneGradient.addColorStop(0, tint(color, 26, 0.18 + emboss * 0.12));
      paneGradient.addColorStop(0.5, 'rgba(255,255,255,0.02)');
      paneGradient.addColorStop(1, tint(color, -12, 0.16));
      ctx.fillStyle = paneGradient;
      ctx.beginPath();
      ctx.roundRect(paneX, paneY, paneW, paneH, radius);
      ctx.fill();

      ctx.strokeStyle = tint(color, 34, 0.22);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(paneX + 0.6, paneY + 0.6, paneW - 1.2, paneH - 1.2, radius - 1);
      ctx.stroke();

      ctx.strokeStyle = tint(color, -26, 0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paneX + paneW * 0.18, paneY + paneH * 0.2);
      ctx.lineTo(paneX + paneW * 0.82, paneY + paneH * 0.8);
      ctx.stroke();
    }
  }
}

export function renderFabricTextureToCanvas(input: FabricTextureRenderInput): FabricTextureRenderResult {
  if (typeof document === 'undefined') {
    return { textureDataUrl: null, decorativeDataUrl: null };
  }

  const width = clamp(Math.round(input.width), 220, 1200);
  const height = clamp(Math.round(input.height), 260, 1600);
  const { material } = input;

  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = width;
  textureCanvas.height = height;
  const textureCtx = textureCanvas.getContext('2d');

  if (!textureCtx) return { textureDataUrl: null, decorativeDataUrl: null };

  textureCtx.fillStyle = tint(input.color, -6, 0.95);
  textureCtx.fillRect(0, 0, width, height);

  const noiseAlpha = 0.035 + clamp(material.surfaceContrast, 0, 100) / 2200;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const grain = ((x * 37 + y * 19) % 100) / 100;
      textureCtx.fillStyle = grain > 0.5 ? tint(input.color, 18, noiseAlpha) : tint(input.color, -14, noiseAlpha);
      textureCtx.fillRect(x, y, 2, 2);
    }
  }

  if (material.type === 'lego_material') {
    drawLegoField(textureCtx, width, height, material, input.color);
  } else if (material.type === 'water_material') {
    drawWaterField(textureCtx, width, height, material, input.color);
  } else if (material.type === 'glass_material') {
    drawGlassField(textureCtx, width, height, material, input.color);
  } else {
    const primaryAngle = directionToAngle(material.threadDirection);
    drawThreadField(textureCtx, width, height, material, input.color, primaryAngle);
    if (material.threadDirection === 'cross' || material.threadDirection === 'diagonal') {
      drawThreadField(textureCtx, width, height, material, input.color, primaryAngle + Math.PI / 2.5);
    }
  }

  const finishGradient = textureCtx.createLinearGradient(0, 0, width, height);
  if (material.finish === 'satin') {
    finishGradient.addColorStop(0, tint(input.color, 26, 0.18));
    finishGradient.addColorStop(0.4, 'rgba(255,255,255,0.02)');
    finishGradient.addColorStop(1, tint(input.color, -28, 0.28));
  } else {
    finishGradient.addColorStop(0, tint(input.color, 14, 0.08));
    finishGradient.addColorStop(1, tint(input.color, -18, 0.14));
  }
  textureCtx.fillStyle = finishGradient;
  textureCtx.fillRect(0, 0, width, height);

  const decorativeCanvas = document.createElement('canvas');
  decorativeCanvas.width = width;
  decorativeCanvas.height = height;
  const decoCtx = decorativeCanvas.getContext('2d');
  if (!decoCtx) return { textureDataUrl: textureCanvas.toDataURL('image/png'), decorativeDataUrl: null };

  if (material.stitchBorder) {
    const pad = Math.round(Math.min(width, height) * 0.05);
    decoCtx.strokeStyle = tint(material.stitchColor, -8, 0.9);
    decoCtx.lineWidth = Math.max(1, material.threadThickness + 0.8);
    decoCtx.setLineDash([9, 7]);
    decoCtx.lineCap = 'round';
    decoCtx.beginPath();
    decoCtx.roundRect(pad, pad, width - pad * 2, height - pad * 2, Math.round(pad * 0.35));
    decoCtx.stroke();

    decoCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    decoCtx.lineWidth = 1;
    decoCtx.setLineDash([2, 12]);
    decoCtx.beginPath();
    decoCtx.roundRect(pad + 4, pad + 4, width - (pad + 4) * 2, height - (pad + 4) * 2, Math.round(pad * 0.3));
    decoCtx.stroke();
  }

  return {
    textureDataUrl: textureCanvas.toDataURL('image/png'),
    decorativeDataUrl: decorativeCanvas.toDataURL('image/png'),
  };
}

export function buildFabricScopeStyle(scope: NonNullable<OutfitBackgroundConfig['materialLayer']>['scope']) {
  if (scope === 'hero_block') {
    return { inset: '8% 6% 45% 6%' };
  }
  if (scope === 'content_block') {
    return { inset: '50% 6% 8% 6%' };
  }
  return { inset: '0' };
}
