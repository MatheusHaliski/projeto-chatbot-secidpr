'use client';

interface OutfitActionBarProps {
  isFavorite: boolean;
  loadingFavorite: boolean;
  onToggleFavorite: () => void;
  onUseAsInspiration: () => void;
  onViewCreatorProfile: () => void;
  onOpenDressTester: () => void;
}

const btn = 'rounded-xl border border-cyan-200/50 bg-[linear-gradient(120deg,rgba(29,78,216,0.72),rgba(8,145,178,0.72))] px-3 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] transition hover:-translate-y-[1px] hover:brightness-110 disabled:opacity-60';

export default function OutfitActionBar(props: OutfitActionBarProps) {
  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(37,99,235,0.32),rgba(15,23,42,0.72))] p-3 text-xs text-white/90 sm:grid-cols-2">
      <button type="button" className={btn} onClick={props.onToggleFavorite} disabled={props.loadingFavorite}>
        {props.loadingFavorite ? 'Saving...' : props.isFavorite ? 'Remove Favorite' : 'Save to Favorites'}
      </button>
      <button type="button" className={btn} onClick={props.onUseAsInspiration}>Use as Inspiration</button>
      <button type="button" className={btn} onClick={props.onViewCreatorProfile}>View Creator Profile</button>
      <button type="button" className={btn} onClick={props.onOpenDressTester}>Open in Dress Tester</button>
    </div>
  );
}
