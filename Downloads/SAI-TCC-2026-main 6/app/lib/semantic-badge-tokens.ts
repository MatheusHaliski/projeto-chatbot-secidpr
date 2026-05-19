import { SemanticTone } from '@/app/components/outfit-card/SemanticGlowBadge';


const tone = (gradient: string, glow: string): SemanticTone => ({
  gradient,
  border: 'border-white/30',
  glow,
  text: 'text-white',
});

export const WEARSTYLE_TONE_MAP: Record<string, SemanticTone> = {
  'statement piece': tone('linear-gradient(120deg, rgba(180,83,9,0.45), rgba(251,191,36,0.3), rgba(253,230,138,0.25))', 'shadow-[0_0_24px_rgba(251,191,36,0.35)]'),
  'visual anchor': tone('linear-gradient(120deg, rgba(76,29,149,0.45), rgba(139,92,246,0.3))', 'shadow-[0_0_24px_rgba(167,139,250,0.34)]'),
  'street energy': tone('linear-gradient(120deg, rgba(190,24,93,0.45), rgba(244,114,182,0.3))', 'shadow-[0_0_24px_rgba(244,114,182,0.33)]'),
  'style accent': tone('linear-gradient(120deg, rgba(8,145,178,0.45), rgba(59,130,246,0.3))', 'shadow-[0_0_24px_rgba(34,211,238,0.33)]'),
  'quiet luxury': tone('linear-gradient(120deg, rgba(30,41,59,0.6), rgba(148,163,184,0.35), rgba(241,245,249,0.25))', 'shadow-[0_0_24px_rgba(203,213,225,0.25)]'),
  'minimal core': tone('linear-gradient(120deg, rgba(241,245,249,0.42), rgba(148,163,184,0.22))', 'shadow-[0_0_20px_rgba(226,232,240,0.28)]'),
  'sport utility': tone('linear-gradient(120deg, rgba(101,163,13,0.45), rgba(20,184,166,0.28))', 'shadow-[0_0_24px_rgba(45,212,191,0.33)]'),
  'creative layering': tone('linear-gradient(120deg, rgba(249,115,22,0.45), rgba(251,146,60,0.3), rgba(147,51,234,0.25))', 'shadow-[0_0_24px_rgba(251,146,60,0.35)]'),
};

export const RARITY_TONE_MAP: Record<string, SemanticTone> = {
  premium: tone('linear-gradient(120deg, rgba(146,64,14,0.5), rgba(251,191,36,0.3))', 'shadow-[0_0_26px_rgba(251,191,36,0.36)]'),
  standard: tone('linear-gradient(120deg, rgba(71,85,105,0.5), rgba(148,163,184,0.3))', 'shadow-[0_0_22px_rgba(148,163,184,0.32)]'),
  'limited edition': tone('linear-gradient(120deg, rgba(88,28,135,0.5), rgba(168,85,247,0.3), rgba(245,158,11,0.15))', 'shadow-[0_0_26px_rgba(168,85,247,0.35)]'),
  rare: tone('linear-gradient(120deg, rgba(14,116,144,0.5), rgba(6,182,212,0.3))', 'shadow-[0_0_24px_rgba(34,211,238,0.35)]'),
};

export const PIECE_TYPE_TONE_MAP: Record<string, SemanticTone> = {
  jacket: tone('linear-gradient(120deg, rgba(180,83,9,0.5), rgba(251,191,36,0.28))', 'shadow-[0_0_22px_rgba(251,191,36,0.36)]'),
  pants: tone('linear-gradient(120deg, rgba(185,28,28,0.5), rgba(244,63,94,0.28))', 'shadow-[0_0_22px_rgba(244,63,94,0.34)]'),
  footwear: tone('linear-gradient(120deg, rgba(190,24,93,0.45), rgba(167,139,250,0.22))', 'shadow-[0_0_18px_rgba(236,72,153,0.3)]'),
  accessory: tone('linear-gradient(120deg, rgba(180,83,9,0.45), rgba(234,179,8,0.25))', 'shadow-[0_0_18px_rgba(251,191,36,0.3)]'),
  top: tone('linear-gradient(120deg, rgba(13,148,136,0.45), rgba(8,145,178,0.25))', 'shadow-[0_0_18px_rgba(34,211,238,0.3)]'),
  bottom: tone('linear-gradient(120deg, rgba(29,78,216,0.45), rgba(30,64,175,0.25))', 'shadow-[0_0_18px_rgba(96,165,250,0.3)]'),
  outerwear: tone('linear-gradient(120deg, rgba(88,28,135,0.45), rgba(30,41,59,0.25))', 'shadow-[0_0_18px_rgba(168,85,247,0.3)]'),
  bag: tone('linear-gradient(120deg, rgba(251,146,60,0.35), rgba(217,119,6,0.25))', 'shadow-[0_0_18px_rgba(251,146,60,0.28)]'),
};

const normalize = (value: string) => value.trim().toLowerCase();

export const resolveSemanticTone = (value: string, map: Record<string, SemanticTone>) => {
  const normalized = normalize(value);
  const exact = map[normalized];
  if (exact) return exact;
  const matchedKey = Object.keys(map).find((key) => normalized.includes(key));
  if (matchedKey) return map[matchedKey];

  const hash = normalized.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hueA = hash % 360;
  const hueB = (hash + 80) % 360;

  return {
    gradient: `linear-gradient(120deg, hsla(${hueA}, 70%, 60%, 0.35), hsla(${hueB}, 70%, 52%, 0.24))`,
    border: 'border-white/30',
    glow: `shadow-[0_0_24px_hsla(${hueA},70%,60%,0.35)]`,
    text: 'text-white',
  };
};
