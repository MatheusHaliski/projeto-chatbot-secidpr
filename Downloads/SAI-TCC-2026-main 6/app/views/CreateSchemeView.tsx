'use client';

import { useState } from 'react';
import ContextSectionMenu from '@/app/components/navigation/ContextSectionMenu';
import PageHeader from '@/app/components/shell/PageHeader';
import SectionBlock from '@/app/components/shared/SectionBlock';

const sections = ['New Scheme', 'Outfit Title', 'Clothes Selection', 'Outfit Preview', 'Publish'];

const clothingOptions = ['Silver Bomber Jacket', 'Structured Black Trousers', 'Leather Crossbody', 'Low-Profile Sneaker', 'Layered Chain'];

export default function CreateSchemeView() {
  const [title, setTitle] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = (item: string) => {
    setSelectedItems((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item],
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ContextSectionMenu title="Create Flow" sections={sections} />
      <div className="space-y-6">
        <PageHeader title="Create Scheme" subtitle="Compose premium outfit concepts and prep them for publishing." />

        <SectionBlock title="Outfit Title" subtitle="Name your next look.">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Midnight Capsule v1"
            className="sa-premium-gradient-surface-soft w-full rounded-xl border border-black/25 px-4 py-3 text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </SectionBlock>

        <SectionBlock title="Clothes Selection" subtitle="Select wardrobe pieces for this scheme.">
          <div className="grid gap-3 sm:grid-cols-2">
            {clothingOptions.map((item) => {
              const active = selectedItems.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleItem(item)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-white bg-white text-black'
                      : 'sa-premium-gradient-surface-soft border-white/25 text-white/90 hover:border-white/50'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </SectionBlock>

        <SectionBlock title="Outfit Preview" subtitle="Live summary before publishing.">
          <div className="sa-premium-gradient-surface-soft rounded-xl border border-dashed border-white/35 p-4">
            <p className="text-sm text-white/60">Title</p>
            <p className="text-lg font-semibold text-white">{title || 'Untitled scheme'}</p>
            <p className="mt-3 text-sm text-white/60">Selected pieces</p>
            <ul className="mt-2 list-inside list-disc text-sm text-white/85">
              {(selectedItems.length ? selectedItems : ['No pieces selected']).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="sa-premium-gradient-surface-soft rounded-xl border border-white/25 p-4 text-sm text-white/80">
            <p className="font-medium text-white">Tagged products</p>
            <p>Connect matching products later to power affiliate-ready outfit drops.</p>
          </div>
          <button className="rounded-xl border border-white/35 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
            Publish
          </button>
        </SectionBlock>
      </div>
    </div>
  );
}
