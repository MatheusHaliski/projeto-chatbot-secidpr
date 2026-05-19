import SemanticGlowBadge from '@/app/components/outfit-card/SemanticGlowBadge';
import { PIECE_TYPE_TONE_MAP, RARITY_TONE_MAP, resolveSemanticTone, WEARSTYLE_TONE_MAP } from '@/app/lib/semantic-badge-tokens';

type VisualTokenType = 'wearstyle' | 'category' | 'rarity';

interface VisualTokenProps {
  type: VisualTokenType;
  value: string;
  compact?: boolean;
  showLabel?: boolean;
}

const TOKEN_ICON: Record<VisualTokenType, string> = {
  wearstyle: '✦',
  rarity: '▲',
  category: '■',
};

export default function VisualToken({ type, value, compact = false, showLabel = true }: VisualTokenProps) {
  const tone =
    type === 'wearstyle'
      ? resolveSemanticTone(value, WEARSTYLE_TONE_MAP)
      : type === 'rarity'
        ? resolveSemanticTone(value, RARITY_TONE_MAP)
        : resolveSemanticTone(value, PIECE_TYPE_TONE_MAP);

  return <SemanticGlowBadge label={showLabel ? value : ''} tone={tone} icon={TOKEN_ICON[type]} compact={compact} />;
}
