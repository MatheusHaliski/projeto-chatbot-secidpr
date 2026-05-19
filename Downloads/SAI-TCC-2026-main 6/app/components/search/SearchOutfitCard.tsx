import OutfitCard from '@/app/components/outfit-card/OutfitCard';
import { OutfitCardData } from '@/app/lib/outfit-card';

interface SearchOutfitCardProps {
  data: OutfitCardData;
  onOpenDetail: () => void;
}

export default function SearchOutfitCard({ data, onOpenDetail }: SearchOutfitCardProps) {
  return (
    <button type="button" className="w-full text-left" onClick={onOpenDetail}>
      <OutfitCard data={data} variant="compact" />
    </button>
  );
}
