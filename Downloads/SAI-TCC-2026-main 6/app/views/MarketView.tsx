import ClothingItemCard from '@/app/components/cards/ClothingItemCard';
import ContextSectionMenu from '@/app/components/navigation/ContextSectionMenu';
import PageHeader from '@/app/components/shell/PageHeader';
import SectionBlock from '@/app/components/shared/SectionBlock';

const sections = ['Trending Clothes', 'New Arrivals', 'Brands', 'Categories', 'Best Sellers'];

const items = [
  { itemName: 'Obsidian Tailored Blazer', brand: 'Maison Noire', price: '$320' },
  { itemName: 'Silver Frame Sunglasses', brand: 'North Atelier', price: '$190' },
  { itemName: 'Luxe Knit Polo', brand: 'Archetype', price: '$140' },
  { itemName: 'Textured Wide-Leg Pants', brand: 'Ninety Seven', price: '$220' },
];

export default function MarketView() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ContextSectionMenu title="Market Index" sections={sections} />
      <div className="space-y-6">
        <PageHeader title="Fashion Market" subtitle="Scan curated products across trending labels and category clusters." />
        <SectionBlock title="Trending Clothes" subtitle="Most viewed items this week.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ClothingItemCard key={item.itemName} {...item} />
            ))}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
