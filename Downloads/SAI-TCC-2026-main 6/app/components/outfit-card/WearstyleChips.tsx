import { inferWearstylesByPieceType, normalizeWearstyles } from '@/app/lib/outfit-card';
import VisualToken from '@/app/components/outfit-card/VisualToken';

interface WearstyleChipsProps {
  wearstyles?: string[];
  pieceType?: string;
}

export default function WearstyleChips({ wearstyles, pieceType }: WearstyleChipsProps) {
  const normalized = normalizeWearstyles(wearstyles);
  const resolvedWearstyles = normalized.length ? normalized : inferWearstylesByPieceType(pieceType);

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">WearStyle Badges</p>
      <div className="flex flex-wrap gap-2">
        {resolvedWearstyles.map((wearstyle) => (
          <VisualToken key={wearstyle} type="wearstyle" value={wearstyle} />
        ))}
      </div>
    </div>
  );
}
