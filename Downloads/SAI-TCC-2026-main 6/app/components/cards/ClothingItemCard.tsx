interface ClothingItemCardProps {
  itemName: string;
  brand: string;
  price: string;
}

export default function ClothingItemCard({ itemName, brand, price }: ClothingItemCardProps) {
  return (
    <article className="sa-premium-gradient-surface-soft rounded-2xl border border-white/20 p-4 shadow-md">
      <div className="mb-3 h-28 rounded-xl bg-gradient-to-br from-cyan-500/40 via-teal-400/45 to-emerald-500/50" />
      <h3 className="text-base font-semibold text-white">{itemName}</h3>
      <p className="text-sm text-white/65">{brand}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{price}</span>
        <button className="rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black">
          View Item
        </button>
      </div>
    </article>
  );
}
