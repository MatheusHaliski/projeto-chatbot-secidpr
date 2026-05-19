import { OutfitDetectedItem, OutfitInterpretationResult, OutfitPromptParseResponse } from '@/app/backend/types/outfit-card-ai';
import {
  COLOR_SYNONYMS,
  MATERIAL_SYNONYMS,
  OCCASION_TAG_SYNONYMS,
  OUTFIT_PIECE_OPTIONS,
  OutfitSlotKey,
  SLOT_TYPE_ALIASES,
  STYLE_TAG_SYNONYMS,
} from '@/app/lib/outfit-piece-options';

type WardrobeItem = { wardrobe_item_id: string; name: string; piece_type: string };

const tokenize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const uniq = (values: Array<string | null | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

const detectByDictionary = (text: string, dict: Record<string, string>) => {
  const normalized = tokenize(text).join(' ');
  const match = Object.entries(dict).find(([key]) => normalized.includes(key));
  return match?.[1] ?? null;
};

export function normalizeDetectedPieceType(value?: string | null): OutfitSlotKey | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const slot = (Object.keys(SLOT_TYPE_ALIASES) as OutfitSlotKey[]).find((key) =>
    SLOT_TYPE_ALIASES[key].some((alias) => normalized.includes(alias)),
  );
  if (slot) return slot;

  for (const [slotKey, options] of Object.entries(OUTFIT_PIECE_OPTIONS) as Array<[OutfitSlotKey, typeof OUTFIT_PIECE_OPTIONS.upper]>) {
    if (options.some((option) => [option.value, option.label.toLowerCase(), ...option.synonyms].some((syn) => normalized.includes(syn)))) {
      return slotKey;
    }
  }

  return null;
}

export function normalizeDetectedColor(value?: string | null) {
  if (!value) return null;
  return detectByDictionary(value, COLOR_SYNONYMS);
}

export function normalizeDetectedMaterial(value?: string | null) {
  if (!value) return null;
  return detectByDictionary(value, MATERIAL_SYNONYMS);
}

export function normalizeTagList(values: string[] | undefined, dict: Record<string, string>) {
  if (!values?.length) return [];
  return uniq(values.map((entry) => detectByDictionary(entry, dict) || entry.trim().toLowerCase()));
}

export function buildOutfitCardDraftFromPrompt(prompt: string): OutfitPromptParseResponse {
  const normalized = prompt.trim();
  const tokens = tokenize(normalized);

  const detectedItems: OutfitDetectedItem[] = [];
  for (const [slot, options] of Object.entries(OUTFIT_PIECE_OPTIONS) as Array<[OutfitSlotKey, typeof OUTFIT_PIECE_OPTIONS.upper]>) {
    options.forEach((option) => {
      const found = [option.value, option.label.toLowerCase(), ...option.synonyms].some((alias) =>
        tokens.join(' ').includes(alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
      );
      if (!found) return;
      detectedItems.push({
        piece_type: slot,
        display_label: option.label,
        color: normalizeDetectedColor(normalized),
        material: normalizeDetectedMaterial(normalized),
        inferred_role: slot === 'upper' ? (detectedItems.some((item) => item.piece_type === 'upper') ? 'outer_layer' : 'base_upper') : null,
        confidence: 0.5,
      });
    });
  }

  return {
    title: normalized ? `AI Outfit · ${normalized.slice(0, 42)}` : 'AI Outfit Draft',
    description: normalized,
    detectedStyleTags: normalizeTagList(tokens, STYLE_TAG_SYNONYMS),
    detectedOccasionTags: normalizeTagList(tokens, OCCASION_TAG_SYNONYMS),
    gender: tokens.includes('masculino') || tokens.includes('male') ? 'masculino' : tokens.includes('feminino') || tokens.includes('female') ? 'feminino' : null,
    mood: tokens.includes('streetwear') ? 'Streetwear' : tokens.includes('casual') ? 'Casual' : null,
    items: detectedItems,
    warnings: detectedItems.length ? [] : ['Nenhuma peça específica foi detectada com alta confiança.'],
  };
}

export function mapAiInterpretationToManualForm(params: {
  interpretation: OutfitInterpretationResult;
  wardrobeItems: WardrobeItem[];
}) {
  const slotAssignments: Partial<Record<OutfitSlotKey, string | null>> = {};
  const aiSlotOptions: Record<OutfitSlotKey, Array<{ value: string; label: string }>> = {
    upper: [],
    lower: [],
    shoes: [],
    accessory: [],
  };

  params.interpretation.items.forEach((item, index) => {
    const slot = normalizeDetectedPieceType(item.piece_type) ?? normalizeDetectedPieceType(item.display_label);
    if (!slot) return;

    const inventoryMatch = params.wardrobeItems.find((wardrobeItem) =>
      wardrobeItem.name.toLowerCase().includes(item.display_label.toLowerCase()),
    );

    const aiOptionId = `suggested:${slot}:ai-${index + 1}`;
    aiSlotOptions[slot].push({ value: aiOptionId, label: item.display_label });

    if (!slotAssignments[slot]) {
      slotAssignments[slot] = inventoryMatch?.wardrobe_item_id || aiOptionId;
    }
  });

  return {
    slotAssignments,
    aiSlotOptions,
    style: params.interpretation.detectedStyleTags[0] || '',
    occasion: params.interpretation.detectedOccasionTags[0] || '',
    title: params.interpretation.title || '',
    mood: params.interpretation.mood || '',
  };
}
