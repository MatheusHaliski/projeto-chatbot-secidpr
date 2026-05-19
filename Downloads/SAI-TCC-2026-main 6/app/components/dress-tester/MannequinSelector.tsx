'use client';

import Image from 'next/image';
import { DRESS_TESTER_GENDERS, DressTesterGender, Mannequin2D } from '@/app/lib/dress-tester-models';

interface MannequinSelectorProps {
  mannequins: Mannequin2D[];
  selectedMannequinId: string | null;
  selectedGender: DressTesterGender;
  resetOnSwitch: boolean;
  onGenderChange: (gender: DressTesterGender) => void;
  onSelectMannequin: (mannequin: Mannequin2D) => void;
  onToggleReset: () => void;
}

export default function MannequinSelector({
  mannequins,
  selectedMannequinId,
  selectedGender,
  resetOnSwitch,
  onGenderChange,
  onSelectMannequin,
  onToggleReset,
}: MannequinSelectorProps) {
  const filtered = mannequins.filter((item) => item.gender === selectedGender);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {DRESS_TESTER_GENDERS.map((gender) => {
          const selected = gender === selectedGender;
          return (
            <button
              key={gender}
              type="button"
              onClick={() => onGenderChange(gender)}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                selected
                  ? 'border-white bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.35)]'
                  : 'border-white/30 bg-black/20 text-white hover:bg-white/10'
              }`}
            >
              {gender}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onToggleReset}
          className={`ml-auto rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${
            resetOnSwitch ? 'border-white/80 bg-white/15 text-white' : 'border-white/20 bg-black/20 text-white/70'
          }`}
        >
          Reset outfit on switch: {resetOnSwitch ? 'on' : 'off'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((mannequin) => {
          const selected = mannequin.mannequin_id === selectedMannequinId;
          return (
            <button
              key={mannequin.mannequin_id}
              type="button"
              onClick={() => onSelectMannequin(mannequin)}
              className={`group rounded-2xl border p-3 text-left transition ${
                selected ? 'border-white bg-white/15' : 'border-white/20 bg-black/20 hover:bg-white/10'
              }`}
            >
              <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded-xl bg-black/30">
                <Image src={mannequin.base_image_url} alt={mannequin.name} fill className="object-contain" />
              </div>
              <p className="text-sm font-semibold text-white">{mannequin.name}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{mannequin.pose_code}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
