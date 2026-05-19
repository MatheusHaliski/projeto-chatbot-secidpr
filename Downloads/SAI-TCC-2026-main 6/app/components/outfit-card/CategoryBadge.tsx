import { PieceCategory } from '@/app/lib/outfit-card';
import VisualToken from '@/app/components/outfit-card/VisualToken';

interface CategoryBadgeProps {
  category?: PieceCategory;
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const resolvedCategory: PieceCategory = category ?? 'Standard';
  return <VisualToken type="rarity" value={resolvedCategory} compact />;
}
