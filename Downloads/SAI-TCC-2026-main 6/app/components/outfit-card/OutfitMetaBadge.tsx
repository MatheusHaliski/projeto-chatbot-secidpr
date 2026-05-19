import VisualToken from '@/app/components/outfit-card/VisualToken';

interface OutfitMetaBadgeProps {
  icon?: string;
  label: string;
}

function inferTokenType(label: string): 'wearstyle' | 'category' | 'rarity' {
  const normalized = label.toLowerCase();
  if (normalized.includes('piece') || normalized.includes('style') || normalized.includes('occasion')) return 'category';
  if (normalized.includes('public') || normalized.includes('private') || normalized.includes('rare') || normalized.includes('premium')) return 'rarity';
  return 'category';
}

export default function OutfitMetaBadge({ icon, label }: OutfitMetaBadgeProps) {
  const tokenType = inferTokenType(label);

  return (
    <span className="inline-flex items-center gap-1.5">
      <VisualToken type={tokenType} value={label} compact showLabel />
      {icon ? <span aria-hidden className="hidden">{icon}</span> : null}
    </span>
  );
}
