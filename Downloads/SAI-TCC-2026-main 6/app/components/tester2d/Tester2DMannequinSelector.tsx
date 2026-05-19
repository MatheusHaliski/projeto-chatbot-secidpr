'use client';

import { MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';

interface Props {
  mannequins: MannequinProfile[];
  selectedId: MannequinProfile['id'];
  onChange: (id: MannequinProfile['id']) => void;
}

export default function Tester2DMannequinSelector({ mannequins, selectedId, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {mannequins.map((mannequin) => (
        <button
          key={mannequin.id}
          onClick={() => onChange(mannequin.id)}
          className={`rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${selectedId === mannequin.id ? 'border-white bg-white text-black' : 'border-white/25 text-white'}`}
        >
          {mannequin.label}
        </button>
      ))}
    </div>
  );
}
