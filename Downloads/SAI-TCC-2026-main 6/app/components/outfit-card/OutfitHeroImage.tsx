interface OutfitHeroImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function OutfitHeroImage({ src, alt, className }: OutfitHeroImageProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/60 bg-slate-200/60 shadow-sm ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`w-full object-cover object-center ${className ? 'h-full min-h-[128px]' : 'h-[320px] sm:h-[420px]'}`} />
    </div>
  );
}
