'use client';

interface PieceFilterBarProps {
  pieceType: string;
  brand: string;
  rarity: string;
  onPieceTypeChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onRarityChange: (value: string) => void;
}

const selectClass = 'rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white';

export default function PieceFilterBar({ pieceType, brand, rarity, onPieceTypeChange, onBrandChange, onRarityChange }: PieceFilterBarProps) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <select value={pieceType} onChange={(event) => onPieceTypeChange(event.target.value)} className={selectClass}>
        <option value="">All Piece Types</option>
        <option value="upper_piece">Upper Piece</option>
        <option value="lower_piece">Lower Piece</option>
        <option value="shoes_piece">Shoes</option>
        <option value="accessory_piece">Accessory</option>
      </select>
      <input value={brand} onChange={(event) => onBrandChange(event.target.value)} placeholder="Filter by brand" className={selectClass} />
      <select value={rarity} onChange={(event) => onRarityChange(event.target.value)} className={selectClass}>
        <option value="">All Rarities</option>
        <option value="Standard">Standard</option>
        <option value="Premium">Premium</option>
        <option value="Rare">Rare</option>
        <option value="Limited Edition">Limited Edition</option>
      </select>
    </div>
  );
}
