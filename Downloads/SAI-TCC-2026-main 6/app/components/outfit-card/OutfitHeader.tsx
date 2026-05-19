import { OutfitMetaBadge as OutfitMetaBadgeType } from '@/app/lib/outfit-card';
import OutfitMetaBadge from '@/app/components/outfit-card/OutfitMetaBadge';
import BrandBadge from '@/app/components/outfit-card/BrandBadge';

interface OutfitHeaderProps {
  outfitName: string;
  outfitStyleLine: string;
  description?: string;
  badges?: OutfitMetaBadgeType[];
  compact?: boolean;
  brandBadges?: Array<{ name: string; logoUrl?: string }>;
  titleFontFamily?: string;
}

export default function OutfitHeader({
  outfitName,
  outfitStyleLine,
  description,
  badges = [],
  compact = false,
  brandBadges = [],
  titleFontFamily,
}: OutfitHeaderProps) {
  return (
    <header className={`space-y-2 rounded-2xl border border-white/20 bg-[linear-gradient(135deg,rgba(67,56,202,0.42),rgba(14,116,144,0.35),rgba(51,65,85,0.5))] shadow-[0_0_30px_rgba(34,211,238,0.18)] backdrop-blur-md ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h3 className={`truncate font-semibold text-white ${compact ? 'text-base' : 'text-xl sm:text-2xl'}`} style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}>{outfitName}</h3>
          {brandBadges.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {brandBadges.slice(0, 4).map((brand) => (
                <BrandBadge key={`${brand.name}-${brand.logoUrl || 'no-logo'}`} brandName={brand.name} brandLogoUrl={brand.logoUrl} variant="compact" />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {badges.map((badge) => (
            <OutfitMetaBadge key={`${badge.label}-${badge.icon || 'plain'}`} icon={badge.icon} label={badge.label} />
          ))}
        </div>
      </div>
      <p className="text-sm font-medium text-cyan-100">{outfitStyleLine}</p>
      {description ? <p className={`leading-relaxed text-white/90 ${compact ? 'line-clamp-2 text-xs' : 'text-sm'}`}>{description}</p> : null}
    </header>
  );
}
