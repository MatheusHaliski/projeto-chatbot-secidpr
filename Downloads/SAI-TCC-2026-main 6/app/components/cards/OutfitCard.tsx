interface OutfitCardProps {
  title: string;
  category: string;
  rating: string;
  username: string;
}

export default function OutfitCard({ title, category, rating, username }: OutfitCardProps) {
  return (
    <article className="mt-6 overflow-hidden bg-white rounded-2xl border-4 border-black shadow-md">
      <div className="h-36 mt-6 ml-6 mr-6 p-10 bg-white rounded-2xl border-4 border-black">
      </div>
      <div className="space-y-2 p-10">
        <h3 className="font-semibold text-black">{title}</h3>
        <p className="text-sm text-black">{category}</p>
        <div className="flex items-center justify-between text-xs text-black">
          <span>Score {rating}</span>
          <span>@{username}</span>
        </div>
      </div>
    </article>
  );
}
