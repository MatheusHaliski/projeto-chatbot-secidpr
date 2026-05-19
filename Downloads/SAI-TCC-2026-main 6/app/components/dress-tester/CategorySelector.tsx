'use client';

import { DRESS_TESTER_CATEGORIES, DressTesterCategory } from '@/app/lib/dress-tester-models';

interface CategorySelectorProps {
  activeCategory: DressTesterCategory;
  onSelect: (category: DressTesterCategory) => void;
}

export default function CategorySelector({ activeCategory, onSelect }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {DRESS_TESTER_CATEGORIES.map((category) => {
        const selected = category === activeCategory;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] transition ${
              selected
                ? 'border-white bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.35)]'
                : 'border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10'
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
