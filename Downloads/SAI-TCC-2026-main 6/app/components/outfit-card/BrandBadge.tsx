'use client';

import { useState } from 'react';


const BRAND_GRADIENTS: Record<string, string> = {
  adidas: 'linear-gradient(120deg, rgba(203,213,225,0.42), rgba(148,163,184,0.24), rgba(34,211,238,0.15))',
  nike: 'linear-gradient(120deg, rgba(251,113,133,0.35), rgba(244,63,94,0.24), rgba(190,24,93,0.2))',
  lacoste: 'linear-gradient(120deg, rgba(16,185,129,0.35), rgba(5,150,105,0.24), rgba(6,182,212,0.2))',
  puma: 'linear-gradient(120deg, rgba(251,146,60,0.35), rgba(249,115,22,0.24), rgba(217,70,239,0.2))',
};

const BRAND_BORDER_COLORS: Record<string, string> = {
  adidas: 'rgba(125, 211, 252, 0.8)',
  nike: 'rgba(251, 113, 133, 0.8)',
  lacoste: 'rgba(52, 211, 153, 0.78)',
  puma: 'rgba(251, 146, 60, 0.8)',
};

function fallbackGradient(name: string) {
  const hash = name.toLowerCase().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hueA = hash % 360;
  const hueB = (hash + 70) % 360;
  return `linear-gradient(120deg, hsla(${hueA}, 72%, 65%, 0.35), hsla(${hueB}, 72%, 55%, 0.24))`;
}

function fallbackBorderColor(name: string) {
  const hash = name.toLowerCase().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return `hsla(${hash % 360}, 82%, 70%, 0.8)`;
}

interface BrandBadgeProps {
  brandName: string;
  brandLogoUrl?: string;
  variant?: 'default' | 'compact';
}

export default function BrandBadge({ brandName, brandLogoUrl, variant = 'default' }: BrandBadgeProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = brandName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('') || 'BR';

  const pillClass = variant === 'compact' ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs';
  const imageClass = variant === 'compact' ? 'h-5 w-5' : 'h-6 w-6';

  const gradient = BRAND_GRADIENTS[brandName.toLowerCase()] || fallbackGradient(brandName);
  const borderColor = BRAND_BORDER_COLORS[brandName.toLowerCase()] || fallbackBorderColor(brandName);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-2 ${pillClass} text-white shadow-[0_0_24px_rgba(139,92,246,0.28)]`}
      style={{ backgroundImage: gradient, borderColor }}
    >
      {brandLogoUrl && !logoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brandLogoUrl} alt={`${brandName} logo`} className={`${imageClass} rounded-full object-contain`} onError={() => setLogoFailed(true)} />
      ) : (
        <span className={`${imageClass} inline-flex items-center justify-center rounded-full border border-white/35 bg-white/15 text-[11px] font-bold`}>
          {initials}
        </span>
      )}
      <span className="max-w-28 truncate font-semibold">{brandName}</span>
    </span>
  );
}
