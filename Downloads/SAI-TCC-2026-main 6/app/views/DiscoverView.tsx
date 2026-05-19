'use client';

import { useState } from 'react';
import CategoryCard from '@/app/components/cards/CategoryCard';
import ContextSectionMenu from '@/app/components/navigation/ContextSectionMenu';
import PageHeader from '@/app/components/shell/PageHeader';
import SectionBlock from '@/app/components/shared/SectionBlock';
import OutfitCard from '@/app/components/cards/OutfitCard';

const sections = ['Style Categories', 'Streetwear', 'Luxury', 'Minimal', 'Sport', 'Vintage'];

const categories = [
  { name: 'Streetwear', description: 'Layered silhouettes, statement sneakers, and expressive fits.' },
  { name: 'Luxury', description: 'Refined tailoring, premium textures, and elevated accessories.' },
  { name: 'Minimal', description: 'Clean lines, neutral palettes, and timeless outfit systems.' },
  { name: 'Sport', description: 'Performance-led details blended with city-ready comfort.' },
  { name: 'Vintage', description: 'Retro references reimagined for modern wardrobes.' },
];

const looksByCategory: Record<string, { title: string; category: string; rating: string; username: string }[]> = {
  Streetwear: [
    { title: 'Chrome Cargo Stack', category: 'Streetwear', rating: '9.1', username: 'zoe_fit' },
    { title: 'Layered Asphalt Kit', category: 'Streetwear', rating: '9.0', username: 'leo_hype' },
  ],
  Luxury: [{ title: 'Graphite Evening Edit', category: 'Luxury', rating: '9.8', username: 'nina_mode' }],
  Minimal: [{ title: 'Pearl Balance Uniform', category: 'Minimal', rating: '9.3', username: 'ion_clean' }],
  Sport: [{ title: 'Sprint Monotone Capsule', category: 'Sport', rating: '8.9', username: 'ryan_motion' }],
  Vintage: [{ title: 'Retro Archive Blend', category: 'Vintage', rating: '9.2', username: 'maya_archive' }],
};

export default function DiscoverView() {
  const [selectedCategory, setSelectedCategory] = useState('Streetwear');

  return (
    <div className="grid gap-6 lg:grid-col">
      <PageHeader title="Discover Styles" subtitle="Explore curated fashion archetypes and drill down into related looks." />
      <ContextSectionMenu title="Discover Sections" sections={sections} />
      <div className="space-y-6">

        <SectionBlock title="Style Categories" subtitle="Select a category to filter looks in real time.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.name}
                name={category.name}
                description={category.description}
                onExplore={() => setSelectedCategory(category.name)}
              />
            ))}
          </div>
        </SectionBlock>

        <SectionBlock title={`${selectedCategory} Looks`} subtitle="Category-driven recommendations.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(looksByCategory[selectedCategory] ?? []).map((look) => (
              <OutfitCard key={look.title} {...look} />
            ))}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
