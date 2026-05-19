'use client';

interface PieceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PieceSearchInput({ value, onChange }: PieceSearchInputProps) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by piece name, brand, wearstyle, color, creator..."
        className="w-full bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
      />
    </label>
  );
}
