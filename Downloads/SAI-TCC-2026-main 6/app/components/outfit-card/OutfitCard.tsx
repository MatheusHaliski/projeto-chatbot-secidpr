'use client';

import { useMemo } from 'react';
import OutfitHeroImage from '@/app/components/outfit-card/OutfitHeroImage';
import OutfitHeader from '@/app/components/outfit-card/OutfitHeader';
import OutfitPieceList from '@/app/components/outfit-card/OutfitPieceList';
import CompactCardActionBar from '@/app/components/profile/CompactCardActionBar';
import {
  OutfitCardData,
  buildBackgroundCssStyle,
  buildOutfitDescriptionFallback,
  resolveBrandLogoUrlByName,
  resolveOutfitBackgroundForRender,
} from '@/app/lib/outfit-card';
import { buildFabricScopeStyle, renderFabricTextureToCanvas } from '@/app/lib/fabricTextureRenderer';
import { buildFabricPresetConfig } from '@/app/lib/materialPresets';

interface GeneratedOutfitCardProps {
  data: OutfitCardData;
  variant?: 'default' | 'compact';
  actions?: Array<{
    label: string;
    onClick?: () => void;
    tone?: 'default' | 'danger' | 'accent';
  }>;
}

export default function OutfitCard({ data, variant = 'default', actions = [] }: GeneratedOutfitCardProps) {
  const description =
    data.outfitDescription === undefined
      ? buildOutfitDescriptionFallback({
          pieces: data.pieces,
          outfitStyleLine: data.outfitStyleLine,
        })
      : data.outfitDescription?.trim() || undefined;

  const resolvedBackground = resolveOutfitBackgroundForRender(data.outfitBackground);
  const backgroundStyle = buildBackgroundCssStyle(resolvedBackground);
  const materialLayer = resolvedBackground.materialLayer;
  const decorativeLayer = resolvedBackground.decorativeOverlayLayer;
  const materialRender = useMemo(() => {
    if (!materialLayer || materialLayer.type === 'none') return { textureDataUrl: null, decorativeDataUrl: null };
    return renderFabricTextureToCanvas({
      width: variant === 'compact' ? 540 : 820,
      height: variant === 'compact' ? 700 : 980,
      color: materialLayer.color || resolvedBackground.solid_color || resolvedBackground.gradient?.stops?.[0]?.color || '#374151',
      material: buildFabricPresetConfig(
        materialLayer.color || resolvedBackground.solid_color || '#334155',
        {
          type: materialLayer.type,
          density: materialLayer.density,
          threadDirection: materialLayer.threadDirection,
          threadThickness: materialLayer.threadThickness,
          embossIntensity: materialLayer.embossIntensity,
          surfaceContrast: materialLayer.surfaceContrast,
          finish: materialLayer.finish,
          scope: materialLayer.scope,
          stitchBorder: decorativeLayer?.stitchBorder,
          stitchColor: decorativeLayer?.stitchColor,
        },
      ),
    });
  }, [decorativeLayer?.stitchBorder, decorativeLayer?.stitchColor, materialLayer, resolvedBackground.gradient?.stops, resolvedBackground.solid_color, variant]);

  const brandBadges = data.pieces
    .map((piece) => ({
      name: piece.brand,
      logoUrl: piece.brandLogoUrl || resolveBrandLogoUrlByName(piece.brand) || undefined,
    }))
    .filter((brand) => Boolean(brand.name?.trim()))
    .filter((brand, index, arr) => arr.findIndex((item) => item.name.toLowerCase() === brand.name.toLowerCase()) === index)
    .slice(0, 4);

  const currentShape = resolvedBackground.shape ?? 'none';
  const shapeSvg = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  const shapeOverlayStyle =
    currentShape === 'none'
      ? null
      : currentShape === 'orb'
        ? {
            backgroundImage:
              'radial-gradient(circle at 78% 16%, rgba(129,140,248,0.48), transparent 34%), radial-gradient(circle at 18% 82%, rgba(56,189,248,0.38), transparent 36%), radial-gradient(circle at 58% 50%, rgba(244,114,182,0.16), transparent 44%)',
          }
        : currentShape === 'diamond'
          ? {
              backgroundImage: `${shapeSvg("<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'><rect x='23' y='23' width='26' height='26' transform='rotate(45 36 36)' fill='rgba(15,23,42,0.48)'/></svg>")},linear-gradient(140deg,rgba(255,255,255,0.08),rgba(15,23,42,0.18))`,
              backgroundSize: '24px 24px,100% 100%',
            }
          : currentShape === 'mesh'
            ? {
                backgroundImage:
                  'linear-gradient(120deg, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0) 42%),linear-gradient(320deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0) 42%),repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 24px),repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 24px)',
              backgroundSize: '100% 100%,100% 100%,24px 24px,24px 24px',
            }
            : currentShape === 'stars'
              ? {
                  backgroundImage: shapeSvg("<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'><polygon points='36,8 42,24 59,24 45,35 50,52 36,42 22,52 27,35 13,24 30,24' fill='rgba(15,23,42,0.58)'/></svg>"),
                  backgroundSize: '36px 36px',
                }
              : currentShape === 'circles'
                ? {
                    backgroundImage: 'radial-gradient(circle, rgba(2,6,23,0.42) 42%, transparent 44%)',
                    backgroundSize: '22px 22px',
                  }
                : currentShape === 'triangles'
                  ? {
                      backgroundImage: shapeSvg("<svg xmlns='http://www.w3.org/2000/svg' width='68' height='68' viewBox='0 0 68 68'><polygon points='34,8 60,56 8,56' fill='rgba(2,6,23,0.44)'/></svg>"),
                      backgroundSize: '32px 32px',
                    }
                  : currentShape === 'waves'
                    ? {
                        backgroundImage: shapeSvg("<svg xmlns='http://www.w3.org/2000/svg' width='140' height='80' viewBox='0 0 140 80'><path d='M0 40 C20 12 50 12 70 40 C90 68 120 68 140 40' stroke='rgba(2,6,23,0.45)' stroke-width='6' fill='none'/></svg>"),
                        backgroundSize: '120px 52px',
                      }
                    : currentShape === 'beams'
                      ? {
                          backgroundImage: 'repeating-linear-gradient(112deg, rgba(255,255,255,0.15) 0 4px, transparent 4px 28px),linear-gradient(112deg, rgba(2,6,23,0.32), transparent 62%)',
                          backgroundSize: '100% 100%,100% 100%',
                        }
                      : currentShape === 'flowers'
                        ? {
                            backgroundImage: shapeSvg("<svg xmlns='http://www.w3.org/2000/svg' width='92' height='92'><ellipse cx='46' cy='25' rx='11' ry='16' fill='rgba(17,24,39,0.72)'/><ellipse cx='60' cy='37' rx='11' ry='16' transform='rotate(50 60 37)' fill='rgba(17,24,39,0.72)'/><ellipse cx='55' cy='55' rx='11' ry='16' transform='rotate(102 55 55)' fill='rgba(17,24,39,0.72)'/><ellipse cx='37' cy='55' rx='11' ry='16' transform='rotate(152 37 55)' fill='rgba(17,24,39,0.72)'/><ellipse cx='32' cy='37' rx='11' ry='16' transform='rotate(206 32 37)' fill='rgba(17,24,39,0.72)'/><circle cx='46' cy='40' r='8.5' fill='rgba(251,191,36,0.9)'/></svg>"),
                            backgroundSize: '46px 46px',
                          }
                        : currentShape === 'arrows'
                          ? {
                              backgroundImage: shapeSvg("<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><path d='M12 44 H62' stroke='rgba(2,6,23,0.55)' stroke-width='7' stroke-linecap='round'/><path d='M50 30 L68 44 L50 58' stroke='rgba(2,6,23,0.55)' stroke-width='7' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>"),
                              backgroundSize: '44px 44px',
                            }
                          : null;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-slate-200/70 shadow-[0_12px_45px_rgba(15,23,42,0.08)] ${variant === 'compact' ? 'space-y-3 p-3' : 'space-y-4 p-4 sm:p-6'}`}
      style={backgroundStyle}
    >
      {materialRender.textureDataUrl ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-0 rounded-[inherit]"
          style={{
            ...buildFabricScopeStyle(materialLayer?.scope || 'card'),
            backgroundImage: `url(${materialRender.textureDataUrl})`,
            backgroundSize: 'cover',
            backgroundBlendMode: 'multiply',
            opacity: 0.84,
          }}
        />
      ) : null}
      {shapeOverlayStyle ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-95" style={shapeOverlayStyle} />
      ) : null}
      {materialRender.decorativeDataUrl ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-0 rounded-[inherit]"
          style={{
            ...buildFabricScopeStyle(materialLayer?.scope || 'card'),
            backgroundImage: `url(${materialRender.decorativeDataUrl})`,
            backgroundSize: 'cover',
            opacity: decorativeLayer?.opacity ?? 0.72,
          }}
        />
      ) : null}
      <div className={`relative z-[1] ${variant === 'compact' ? 'space-y-3' : 'space-y-4'}`}>
        <OutfitHeroImage src={data.heroImageUrl} alt={`${data.outfitName} hero preview`} className={variant === 'compact' ? 'h-32 rounded-2xl' : ''} />
        <OutfitHeader
          outfitName={data.outfitName}
          outfitStyleLine={data.outfitStyleLine}
          description={description}
          badges={data.metaBadges}
          compact={variant === 'compact'}
          brandBadges={brandBadges}
          titleFontFamily={data.titleFontFamily}
        />
        <OutfitPieceList pieces={data.pieces} compact={variant === 'compact'} />
        {actions.length ? <CompactCardActionBar actions={actions} /> : null}
      </div>
    </section>
  );
}
