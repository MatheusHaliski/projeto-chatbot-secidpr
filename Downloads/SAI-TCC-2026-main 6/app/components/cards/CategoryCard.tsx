interface CategoryCardProps {
  name: string;
  description: string;
  onExplore: () => void;
}

export default function CategoryCard({ name, description, onExplore }: CategoryCardProps) {
  return (
    <article className="space-y-3 rounded-2xl border border-black p-4 bg-white">
      <div className="space-y-3 h-36 rounded-2xl border border-black p-4 bg-white" />
      <h3 className="text-base font-semibold text-black">{name}</h3>
      <p className="text-sm text-black">{description}</p>
      <button
        type="button"
        onClick={onExplore}
        className="rounded-lg h-15 border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-black hover:text-black"
      >
        Explore Looks
      </button>
    </article>
  );
}
