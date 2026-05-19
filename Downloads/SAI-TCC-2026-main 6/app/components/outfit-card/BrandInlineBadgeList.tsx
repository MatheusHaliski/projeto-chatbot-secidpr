import BrandBadge from '@/app/components/outfit-card/BrandBadge';
import { resolveBrandLogoUrlByName } from '@/app/lib/outfit-card';

interface BrandInlineBadgeListProps {
  brands: string[];
}

export default function BrandInlineBadgeList({ brands }: BrandInlineBadgeListProps) {
  if (!brands.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {brands.slice(0, 4).map((brand) => (
        <BrandBadge key={brand} brandName={brand} brandLogoUrl={resolveBrandLogoUrlByName(brand) || undefined} variant="compact" />
      ))}
    </div>
  );
}
