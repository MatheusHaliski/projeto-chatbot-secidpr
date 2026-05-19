'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuthSessionProfile } from '@/app/lib/authSession';
import { getServerSession } from '@/app/lib/clientSession';
import PageHeader from '@/app/components/shell/PageHeader';
import OutfitCard from '@/app/components/outfit-card/OutfitCard';
import SaiModalAlert from '@/app/components/shared/SaiModalAlert';
import SectionBlock from '@/app/components/shared/SectionBlock';
import FancySelect from '@/app/components/ui/fancy-select';
import DescriptionModeSelector from '@/app/components/create-scheme/DescriptionModeSelector';
import GenerationModePanel from '@/app/components/create-scheme/GenerationModePanel';
import SaveSummaryPanel from '@/app/components/create-scheme/SaveSummaryPanel';
import SchemeStepCard from '@/app/components/create-scheme/SchemeStepCard';
import SlotReviewCard from '@/app/components/create-scheme/SlotReviewCard';
import SchemeStepSidebar from '@/app/components/create-scheme/SchemeStepSidebar';
import OutfitBackgroundStudioModal from '@/app/components/create-scheme/OutfitBackgroundStudioModal';
import { OutfitInterpretResponse, OutfitInterpretationResult } from '@/app/backend/types/outfit-card-ai';
import { mapAiInterpretationToManualForm } from '@/app/lib/outfit-ai-mapping';
import { OUTFIT_PIECE_OPTIONS, OutfitSlotKey, SLOT_TYPE_ALIASES } from '@/app/lib/outfit-piece-options';
import {
  OutfitBackgroundConfig,
  OutfitCardData,
  OutfitPiece,
  resolveOutfitBackgroundForRender,
  buildOutfitDescriptionRich,
  resolveBrandLogoUrlByName,
} from '@/app/lib/outfit-card';

type Brand = { brand_id: string; name: string; logo_url?: string | null };
type SchemePieceSnapshot = {
  id: string;
  slot: SlotKey;
  sourceType: 'wardrobe' | 'suggested';
  sourceId: string;
  name: string;
  brand: string;
  brandLogoUrl?: string;
  pieceType: string;
  category: NonNullable<OutfitPiece['category']>;
  wearstyles: string[];
};

type SlotKey = 'upper' | 'lower' | 'shoes' | 'accessory';
type DescriptionMode = 'ai' | 'manual' | 'none';
type GenerationMode = 'manual' | 'ai';

type WardrobeItem = { wardrobe_item_id: string; name: string; piece_type: string };
type AiGenerationError = { code: string; message: string; requestId?: string };

const normalizeSchemePieceType = (value: string) => value.trim().toLowerCase();

const DEFAULT_SLOT_SUGGESTIONS: Record<
  SlotKey,
  Array<{ value: string; label: string }>
> = {
  upper: OUTFIT_PIECE_OPTIONS.upper.map((option) => ({ value: `suggested:upper:${option.value}`, label: option.label })),
  lower: OUTFIT_PIECE_OPTIONS.lower.map((option) => ({ value: `suggested:lower:${option.value}`, label: option.label })),
  shoes: OUTFIT_PIECE_OPTIONS.shoes.map((option) => ({ value: `suggested:shoes:${option.value}`, label: option.label })),
  accessory: OUTFIT_PIECE_OPTIONS.accessory.map((option) => ({ value: `suggested:accessory:${option.value}`, label: option.label })),
};

const sections = ['Scheme Basics', 'Build Outfit', 'AI Assist', 'Slots Review', 'Card Background', 'Save & Generate'];
const STYLE_OPTIONS = ['Urban', 'Casual', 'Formal', 'Outdoors'];
const OCCASION_OPTIONS = ['Shift', 'Work', 'Daily', 'Night', 'Party'];
const TITLE_FONT_OPTIONS = ['Inter, Segoe UI, sans-serif', 'Georgia, serif', 'Trebuchet MS, sans-serif', 'monospace'];
const SLOT_AUTO_WEARSTYLE: Record<SlotKey, string[]> = {
  upper: ['Statement Piece'],
  lower: ['Visual Anchor'],
  shoes: ['Street Energy'],
  accessory: ['Style Accent'],
};
const SLOT_DEFAULT_PIECE_TYPES: Record<SlotKey, string> = {
  upper: 'Jacket',
  lower: 'Pants',
  shoes: 'Footwear',
  accessory: 'Accessory',
};
const SLOT_DEFAULT_CATEGORIES: Record<SlotKey, NonNullable<OutfitPiece['category']>> = {
  upper: 'Premium',
  lower: 'Standard',
  shoes: 'Rare',
  accessory: 'Limited Edition',
};
const SLOT_ICONS: Record<SlotKey, string> = {
  upper: '🧥',
  lower: '👖',
  shoes: '👟',
  accessory: '👜',
};

const DEFAULT_BRAND_ID = 'default';
const FALLBACK_BRANDS: Brand[] = [
  {
    brand_id: 'lacoste',
    name: 'Lacoste',
    logo_url: '/lacoste.jpg',
  },
];

const DEFAULT_BACKGROUND_CONFIG: OutfitBackgroundConfig = {
  background_mode: 'gradient',
  gradient: {
    type: 'linear',
    angle: 135,
    intensity: 100,
    stops: [
      { color: '#0f172a', position: 0 },
      { color: '#4c1d95', position: 100 },
    ],
  },
  shape: 'orb',
};

const formatDisplayName = (value?: string) =>
  String(value || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');

export default function CreateMySchemeView() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('Minimal');
  const [occasion, setOccasion] = useState('Daily');
  const [visibility, setVisibility] = useState<'private' | 'public'>('public');
  const [selectedBrandId, setSelectedBrandId] = useState(DEFAULT_BRAND_ID);
  const [slotBrandIds, setSlotBrandIds] = useState<Record<SlotKey, string>>({
    upper: DEFAULT_BRAND_ID,
    lower: DEFAULT_BRAND_ID,
    shoes: DEFAULT_BRAND_ID,
    accessory: DEFAULT_BRAND_ID,
  });
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [outfitBackgroundConfig, setOutfitBackgroundConfig] = useState<OutfitBackgroundConfig>(DEFAULT_BACKGROUND_CONFIG);
  const [backgroundStudioOpen, setBackgroundStudioOpen] = useState(false);
  const [descriptionMode, setDescriptionMode] = useState<DescriptionMode>('ai');
  const [manualDescription, setManualDescription] = useState('');
  const [descriptionOverride, setDescriptionOverride] = useState('');
  const [titleFontFamily, setTitleFontFamily] = useState('Inter, Segoe UI, sans-serif');
  const [palette, setPalette] = useState('Neutral');
  const [mood, setMood] = useState('Urban Premium');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('manual');
  const [aiInterpreting, setAiInterpreting] = useState(false);
  const [aiError, setAiError] = useState<AiGenerationError | null>(null);
  const [aiInterpretation, setAiInterpretation] = useState<OutfitInterpretationResult | null>(null);
  const [aiSlotSuggestions, setAiSlotSuggestions] = useState<Record<SlotKey, Array<{ value: string; label: string }>>>({
    upper: [],
    lower: [],
    shoes: [],
    accessory: [],
  });
  const [selectedSection, setSelectedSection] = useState(sections[0]);
  const [slots, setSlots] = useState<Record<SlotKey, string | null>>({
    upper: null,
    lower: null,
    shoes: null,
    accessory: null,
  });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [generatedCardData, setGeneratedCardData] = useState<OutfitCardData | null>(null);
  const [isGeneratingPremiumDesc, setIsGeneratingPremiumDesc] = useState(false);

  const inputClassName =
    'w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/40';
  const slotCardClassName =
    'rounded-xl border border-white/20 bg-white/10 p-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md';
  const primaryButtonClassName =
    'rounded-xl border border-white/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(139,92,246,0.35)] transition hover:scale-[1.01] hover:brightness-110';
  const secondaryButtonClassName =
    'rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:scale-[1.01] hover:bg-white/15';

  useEffect(() => {
    const draftRaw = typeof window !== 'undefined' ? sessionStorage.getItem('sai_scheme_inspiration') : null;
    if (draftRaw) {
      window.setTimeout(() => {
        try {
          const draft = JSON.parse(draftRaw) as OutfitCardData;
          if (draft.outfitName) setTitle(`${draft.outfitName} · Inspired`);
          if (draft.outfitStyleLine) setStyle(draft.outfitStyleLine.split('•')[0]?.trim() || 'Minimal');
        } catch {}
        sessionStorage.removeItem('sai_scheme_inspiration');
      }, 0);
    }

    const loadSessionAndItems = async () => {
      const localProfile = getAuthSessionProfile();
      let resolvedUserId = localProfile.user_id?.trim() || '';

      if (!resolvedUserId) {
        const serverProfile = await getServerSession();
        resolvedUserId = serverProfile?.user_id?.trim() || '';
      }

      if (!resolvedUserId) {
        setAlertMessage('User session not found. Please sign in again.');
        setItems([]);
        return;
      }

      setUserId(resolvedUserId);

      const [itemsResponse, brandsResponse] = await Promise.all([
        fetch(`/api/wardrobe-items/user/${resolvedUserId}`),
        fetch('/api/brands'),
      ]);

      const itemsData = await itemsResponse.json().catch(() => []);
      const brandsData = await brandsResponse.json().catch(() => []);

      const parsedItems = Array.isArray(itemsData) ? itemsData : [];
      const apiBrands = Array.isArray(brandsData) ? (brandsData as Brand[]) : [];

      setItems(parsedItems);
      setBrands([
        ...apiBrands,
        ...FALLBACK_BRANDS.filter(
          (fallback) => !apiBrands.some((brand) => brand.brand_id === fallback.brand_id),
        ),
      ]);
    };

    loadSessionAndItems().catch(() => {
      setAlertMessage('Unable to load user session. Please sign in again.');
      setItems([]);
      setBrands(FALLBACK_BRANDS);
    });
  }, []);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.brand_id === selectedBrandId) ?? null,
    [brands, selectedBrandId],
  );

  const resolvedBrands = useMemo(() => ({
    defaultBrand: selectedBrand,
    byId: new Map(brands.map((brand) => [brand.brand_id, brand])),
  }), [brands, selectedBrand]);

  const filledSlotsCount = useMemo(() => Object.values(slots).filter(Boolean).length, [slots]);


  const completedSections = useMemo(() => sections.filter((section) => {
    if (section === 'Scheme Basics') return Boolean(title.trim()) && Boolean(style.trim()) && Boolean(occasion.trim());
    if (section === 'Build Outfit') return Object.values(slots).some(Boolean);
    if (section === 'AI Assist') return Boolean(aiPrompt.trim()) || generationMode === 'ai';
    if (section === 'Slots Review') return filledSlotsCount > 0;
    if (section === 'Card Background') return Boolean(outfitBackgroundConfig.background_mode);
    return Boolean(generatedCardData);
  }), [title, style, occasion, slots, aiPrompt, generationMode, filledSlotsCount, outfitBackgroundConfig.background_mode, generatedCardData]);

  const isFormValid = useMemo(
    () =>
      Boolean(title.trim()) &&
      Boolean(style.trim()) &&
      Boolean(occasion.trim()) &&
      Object.values(slots).some(Boolean),
    [title, style, occasion, slots],
  );

  const schemeItems = useMemo(
    () =>
      Object.entries(slots)
        .filter(([, id]) => Boolean(id))
        .map(([slot, id], idx) => ({
          wardrobe_item_id: String(id),
          slot,
          sort_order: idx + 1,
        })),
    [slots],
  );

  const resolveSlotSelectionLabel = (slot: SlotKey) => {
    const selectedValue = slots[slot];
    if (!selectedValue) return 'No piece selected';
    const suggested = DEFAULT_SLOT_SUGGESTIONS[slot].find((option) => option.value === selectedValue);
    if (suggested) return suggested.label;
    const selectedItem = items.find((item) => item.wardrobe_item_id === selectedValue);
    return selectedItem?.name || 'Custom selection';
  };

  const resolveBrandForSlot = (slot: SlotKey) => {
    const configuredBrandId = slotBrandIds[slot] || DEFAULT_BRAND_ID;
    if (configuredBrandId === DEFAULT_BRAND_ID) return resolvedBrands.defaultBrand;
    return resolvedBrands.byId.get(configuredBrandId) ?? resolvedBrands.defaultBrand;
  };

  const buildOutfitBackgroundConfig = () => {
    return outfitBackgroundConfig;
  };

  const buildGeneratedOutfitCardData = (): OutfitCardData => {
    const defaultBrandName = selectedBrand?.name || 'SELECTION';

    const pieces = (Object.keys(slots) as SlotKey[])
      .map((slot) => {
        const selectedValue = slots[slot];
        if (!selectedValue) return null;

        const inventoryItem = items.find((item) => item.wardrobe_item_id === selectedValue);
        const suggestedItem = DEFAULT_SLOT_SUGGESTIONS[slot].find((suggestion) => suggestion.value === selectedValue);
        const derivedName = inventoryItem?.name || suggestedItem?.label || `${formatDisplayName(slot)} Piece`;
        const pieceType = formatDisplayName(inventoryItem?.piece_type || SLOT_DEFAULT_PIECE_TYPES[slot]);
        const resolvedSlotBrand = resolveBrandForSlot(slot);
        const slotBrandName = resolvedSlotBrand?.name || defaultBrandName;

        return {
          id: selectedValue,
          name: derivedName,
          brand: slotBrandName,
          brandLogoUrl: resolveBrandLogoUrlByName(slotBrandName) || resolvedSlotBrand?.logo_url || undefined,
          pieceType,
          category: SLOT_DEFAULT_CATEGORIES[slot],
          wearstyles: SLOT_AUTO_WEARSTYLE[slot],
        } as OutfitPiece;
      })
      .filter(Boolean) as OutfitPiece[];

    const description =
      descriptionOverride.trim()
        ? descriptionOverride.trim()
        : descriptionMode === 'manual'
          ? manualDescription.trim() || undefined
          : descriptionMode === 'none'
            ? ''
            : buildOutfitDescriptionRich({
                outfitName: title.trim() || 'My New Scheme',
                style,
                occasion,
                visibility,
                brand: selectedBrand?.name || 'Selection',
                palette,
                mood,
                pieces,
      titleFontFamily,
              });

    return {
      outfitName: title.trim() || 'My New Scheme',
      outfitStyleLine: `${style.trim() || 'Minimal'} · ${occasion.trim() || 'Daily'}`,
      outfitDescription: description,
      heroImageUrl: heroImageUrl.trim() || '/models/model-default.jpeg',
      outfitBackground: buildOutfitBackgroundConfig(),
      metaBadges: [
        { icon: '👕', label: style.trim() || 'Casual' },
        { icon: '📆', label: occasion.trim() || 'Daily' },
        { icon: visibility === 'public' ? '🌐' : '🔒', label: visibility === 'public' ? 'Public' : 'Private' },
        { icon: generationMode === 'manual' ? '✍️' : '✨', label: generationMode === 'manual' ? 'Manual' : 'AI' },
        palette.trim() ? { icon: '🎨', label: palette.trim() } : null,
      ].filter(Boolean) as NonNullable<OutfitCardData['metaBadges']>,
      pieces,
      titleFontFamily,
    };
  };

  const buildSchemePieceSnapshots = (pieces: OutfitPiece[]): SchemePieceSnapshot[] =>
    pieces.map((piece) => {
      const slot = (Object.keys(slots) as SlotKey[]).find((slotKey) => slots[slotKey] === piece.id) || 'upper';
      const sourceType = piece.id.startsWith('suggested:') ? 'suggested' : 'wardrobe';
      return {
        id: piece.id,
        slot,
        sourceType,
        sourceId: piece.id,
        name: piece.name,
        brand: piece.brand,
        brandLogoUrl: piece.brandLogoUrl,
        pieceType: piece.pieceType,
        category: piece.category || 'Standard',
        wearstyles: piece.wearstyles || [],
      };
    });

  const uploadHeroImage = (file: File) => {
    setHeroImageUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setHeroImageUrl(result);
      setHeroImageUploading(false);
    };
    reader.onerror = () => {
      setAlertMessage('Unable to process image. Please try another file.');
      setHeroImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveScheme = async (
    creationMode: GenerationMode,
    pieceSnapshots: SchemePieceSnapshot[],
  ) => {
    if (!userId) {
      setAlertMessage('User session not found. Please sign in again.');
      return false;
    }

    if (schemeItems.length === 0) {
      setAlertMessage('Select at least one wardrobe item before saving.');
      return false;
    }

    try {
      const selectedBackground = buildOutfitBackgroundConfig();

      const response = await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title: title.trim() || 'My New Scheme',
          description: JSON.stringify({
            outfitBackground: selectedBackground,
            descriptionMode,
            descriptionText: descriptionMode === 'manual' ? manualDescription.trim() : null,
            mood,
            palette,
            titleFontFamily,
            descriptionOverride: descriptionOverride.trim() || null,
          }),
          style: style.trim() || 'Minimal',
          occasion: occasion.trim() || 'Daily',
          cover_image_url: heroImageUrl.trim() || null,
          visibility,
          creation_mode: creationMode,
          pieces: pieceSnapshots,
          items: schemeItems,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setAlertMessage(payload?.error || 'Unable to save scheme. Please try again.');
        return false;
      }

      setAlertMessage('Scheme saved successfully.');
      return true;
    } catch {
      setAlertMessage('Unable to save scheme. Please try again.');
      return false;
    }
  };

  const optionsByType = (slot: SlotKey) => {
    const aliases = SLOT_TYPE_ALIASES[slot as OutfitSlotKey];
    return items.filter((item) => aliases.includes(normalizeSchemePieceType(item.piece_type)));
  };

  const generateFromAiPrompt = async () => {
    const normalizedPrompt = aiPrompt.toLowerCase().trim();
    if (!normalizedPrompt) {
      setAlertMessage('Write a prompt before running AI generation.');
      return false;
    }
    if (aiInterpreting) return false;

    setAiInterpreting(true);
    setAiError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      let response: Response;
      try {
        response = await fetch('/api/outfit-card/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: normalizedPrompt, locale: 'pt-BR' }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const payload = (await response.json().catch(() => null)) as OutfitInterpretResponse | null;
      const hasValidItems = Boolean(payload?.data && Array.isArray(payload.data.items));
      if (!response.ok || !payload?.success || !hasValidItems) {
        const errorCode = payload?.error_code || (!hasValidItems ? 'INVALID_AI_RESPONSE' : 'AI_INTERPRETATION_FAILED');
        const userMessage = payload?.error || 'Unable to interpret this look right now.';
        console.error('AI GENERATION ERROR', {
          code: errorCode,
          requestId: payload?.request_id,
          status: response.status,
          payload,
        });
        setAiError({
          code: errorCode,
          message: userMessage,
          requestId: payload?.request_id,
        });
        setAlertMessage(userMessage);
        return false;
      }

      const interpretation = payload.data;
      if (!interpretation) {
        setAiError({
          code: 'INVALID_AI_RESPONSE',
          message: 'Unable to interpret this look right now.',
          requestId: payload.request_id,
        });
        setAlertMessage('Unable to interpret this look right now.');
        return false;
      }

      setAiInterpretation(interpretation);
      const matchingBrand = brands.find((brand) => normalizedPrompt.includes(brand.name.toLowerCase()));
      if (matchingBrand) setSelectedBrandId(matchingBrand.brand_id);

      const mapping = mapAiInterpretationToManualForm({
        interpretation,
        wardrobeItems: items,
      });

      setAiSlotSuggestions(mapping.aiSlotOptions);
      setSlots((prev) => ({
        ...prev,
        upper: mapping.slotAssignments.upper ?? prev.upper ?? null,
        lower: mapping.slotAssignments.lower ?? prev.lower ?? null,
        shoes: mapping.slotAssignments.shoes ?? prev.shoes ?? null,
        accessory: mapping.slotAssignments.accessory ?? prev.accessory ?? null,
      }));

      if (mapping.style) setStyle(mapping.style);
      if (mapping.occasion) setOccasion(mapping.occasion);
      if (mapping.mood) setMood(mapping.mood);
      if (!title.trim() && mapping.title) setTitle(mapping.title);
      setGenerationMode('ai');
      setAlertMessage('Look interpreted. You can keep editing manually.');
      return true;
    } catch (error) {
      const code = error instanceof Error && error.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_REQUEST_FAILED';
      const message = code === 'AI_TIMEOUT'
        ? 'AI generation timed out. Please try again.'
        : 'Unable to interpret this look right now.';
      console.error('AI GENERATION ERROR', { code, error });
      setAiError({ code, message });
      setAlertMessage(message);
      return false;
    } finally {
      setAiInterpreting(false);
    }
  };

  const generatePremiumDescription = async () => {
    setIsGeneratingPremiumDesc(true);
    try {
      const piecesData = (Object.keys(slots) as SlotKey[]).map((slot) => {
        const selectedValue = slots[slot];
        if (!selectedValue) return null;
        const item = items.find((i) => i.wardrobe_item_id === selectedValue);
        const suggested = DEFAULT_SLOT_SUGGESTIONS[slot].find((s) => s.value === selectedValue);
        return {
          name: item?.name || suggested?.label || `${slot} piece`,
          brand: resolveBrandForSlot(slot)?.name || 'Unknown',
        };
      }).filter(Boolean);

      if (piecesData.length === 0) {
        setAlertMessage('Please select at least one piece to generate a description.');
        return;
      }

      const response = await fetch('/api/ai/fashion/generate-card-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieces: piecesData,
          overallColors: [palette].filter(Boolean),
          dominantStyle: style,
          season: 'all-season',
          userIntent: aiPrompt,
          occasion: occasion,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setAlertMessage(payload.message || 'Error generating description');
        return;
      }

      const data = payload.data;
      if (data.editorialTitle) setTitle(data.editorialTitle);
      if (data.dominantStyle) setStyle(data.dominantStyle);
      if (data.longDescription) {
        setManualDescription(data.longDescription);
        setDescriptionMode('manual');
      }
      setAlertMessage('Premium editorial description generated successfully!');
    } catch (error: any) {
      setAlertMessage(error.message || 'Error generating description');
    } finally {
      setIsGeneratingPremiumDesc(false);
    }
  };

  const handleFinalSave = async () => {
    if (!isFormValid) {
      setAlertMessage('Fill title, style, occasion, and assign at least one slot before saving.');
      return;
    }

    const nextGeneratedCardData = buildGeneratedOutfitCardData();
    const pieceSnapshots = buildSchemePieceSnapshots(nextGeneratedCardData.pieces);
    const isSaved = await saveScheme(generationMode, pieceSnapshots);
    if (!isSaved) return;
    setGeneratedCardData(nextGeneratedCardData);
    setSelectedSection('Save & Generate');
  };

  const renderManualBuilder = () => (
    <SectionBlock
      title="Build Outfit"
      subtitle="Define metadata, description behavior, and slot assignment manually."
      className="sa-surface-header h-auto border-white/20"
    >
      <form className="mt-4 grid gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.14)] backdrop-blur-md md:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className={inputClassName}
        />


        <FancySelect
          value={titleFontFamily}
          onChange={setTitleFontFamily}
          placeholder="Title Font"
          options={TITLE_FONT_OPTIONS.map((font) => ({ value: font, label: font }))}
        />

        <input value={descriptionOverride} onChange={(e) => setDescriptionOverride(e.target.value)} placeholder="Card description override (optional)" className={`${inputClassName} md:col-span-2`} />

        <FancySelect
          value={style}
          onChange={setStyle}
          placeholder="Style"
          options={STYLE_OPTIONS.map((option) => ({
            value: option,
            label: option,
            group: 'Style',
          }))}
        />

        <FancySelect
          value={occasion}
          onChange={setOccasion}
          placeholder="Occasion"
          options={OCCASION_OPTIONS.map((option) => ({
            value: option,
            label: option,
            group: 'Occasion',
          }))}
        />

        <FancySelect
          value={visibility}
          onChange={(selectedVisibility) => setVisibility(selectedVisibility as 'private' | 'public')}
          options={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
        />

        <input value={palette} onChange={(e) => setPalette(e.target.value)} placeholder="Palette (e.g. Blue / Neutral)" className={inputClassName} />
        <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood / aesthetic" className={inputClassName} />

        <FancySelect
          value={selectedBrandId}
          onChange={setSelectedBrandId}
          placeholder="SELECTION Default Brand"
          options={[
            {
              value: DEFAULT_BRAND_ID,
              label: 'SELECTION Default Brand',
              icon: { type: 'emoji', value: '🏷️', alt: 'Default brand' },
            },
            ...brands.map((brand) => {
              const logoUrl = resolveBrandLogoUrlByName(brand.name) || brand.logo_url || null;

              return {
                value: brand.brand_id,
                label: brand.name,
                icon: logoUrl
                  ? { type: 'image' as const, value: logoUrl, alt: `${brand.name} logo` }
                  : { type: 'emoji' as const, value: '🏷️', alt: `${brand.name} brand` },
              };
            }),
          ]}
        />

        <FancySelect
          value={outfitBackgroundConfig.background_mode}
          onChange={() => setBackgroundStudioOpen(true)}
          placeholder="Background Studio"
          options={[
            { value: 'solid', label: 'Open Background Studio · Solid' },
            { value: 'gradient', label: 'Open Background Studio · Gradient' },
            { value: 'ai_artwork', label: 'Open Background Studio · AI Artwork' },
          ]}
        />

        <button
          type="button"
          className={`${slotCardClassName} md:col-span-2`}
          onClick={() => setBackgroundStudioOpen(true)}
        >
          <p className="text-xs uppercase tracking-[0.13em] text-white/60">Background</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="h-10 w-10 rounded-lg border border-white/30" style={(() => {
              const resolved = resolveOutfitBackgroundForRender(outfitBackgroundConfig);
              if (resolved.background_mode === 'solid') {
                return { background: resolved.solid_color || '#111827' };
              }
              if (resolved.background_mode === 'gradient') {
                const stops = resolved.gradient?.stops?.map((stop) => `${stop.color} ${stop.position}%`).join(', ') || '#111827, #1f2937';
                return { backgroundImage: `linear-gradient(${resolved.gradient?.angle ?? 130}deg, ${stops})` };
              }
              return { backgroundImage: `url(${resolved.ai_artwork?.image_url || '/models/model-default.jpeg'})`, backgroundSize: 'cover' };
            })()} />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Open Studio</p>
              <p className="text-xs text-white/70">
                Current mode: {outfitBackgroundConfig.background_mode.replace('_', ' ')}
              </p>
            </div>
          </div>
        </button>

        <label className={`${inputClassName} block cursor-pointer`}>
          <span className="block text-[11px] uppercase tracking-[0.12em] text-white/60">Hero image upload</span>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-xs text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-white/30"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              uploadHeroImage(file);
            }}
          />
          <span className="mt-1 block text-xs text-white/65">
            {heroImageUploading
              ? 'Uploading image...'
              : heroImageUrl
                ? 'Hero image uploaded successfully.'
                : 'Upload a photo of the person wearing the outfit.'}
          </span>
        </label>

        <DescriptionModeSelector value={descriptionMode} onChange={setDescriptionMode} />

        <button
          type="button"
          onClick={generatePremiumDescription}
          disabled={isGeneratingPremiumDesc || filledSlotsCount === 0}
          className={`${primaryButtonClassName} md:col-span-2 flex justify-center items-center gap-2`}
        >
          <span>✨</span> {isGeneratingPremiumDesc ? 'Generating Premium Editorial Copy...' : 'Generate Premium Editorial Copy with Google AI'}
        </button>

        {descriptionMode === 'manual' ? (
          <textarea
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            placeholder="Write the description for this outfit card..."
            className={`${inputClassName} min-h-24 md:col-span-2`}
          />
        ) : null}

        {(['upper', 'lower', 'shoes', 'accessory'] as const).map((slot) => (
          <div key={slot} className={`${slotCardClassName} relative overflow-visible`}>
            <p className="text-sm font-semibold capitalize text-white">{slot} piece</p>

            <div className="mt-2">
              <FancySelect
                value={slots[slot] ?? ''}
                onChange={(selectedValue) =>
                  setSlots((prev) => ({
                    ...prev,
                    [slot]: selectedValue || null,
                  }))
                }
                placeholder="Select item"
                options={[
                  { value: '', label: 'Select item' },
                  ...DEFAULT_SLOT_SUGGESTIONS[slot].map((suggestion) => ({
                    value: suggestion.value,
                    label: suggestion.label,
                    hint: 'Suggested',
                  })),
                  ...aiSlotSuggestions[slot].map((suggestion) => ({
                    value: suggestion.value,
                    label: suggestion.label,
                    hint: 'AI',
                  })),
                  ...optionsByType(slot).map((item) => ({
                    value: item.wardrobe_item_id,
                    label: item.name,
                  })),
                ]}
              />
            </div>

            <div className="mt-2">
              <FancySelect
                value={slotBrandIds[slot] ?? DEFAULT_BRAND_ID}
                onChange={(selectedSlotBrandId) =>
                  setSlotBrandIds((prev) => ({
                    ...prev,
                    [slot]: selectedSlotBrandId || DEFAULT_BRAND_ID,
                  }))
                }
                placeholder="Brand for this piece"
                options={[
                  {
                    value: DEFAULT_BRAND_ID,
                    label: 'Use default outfit brand',
                    hint: selectedBrand?.name || 'SELECTION',
                  },
                  ...brands.map((brand) => ({
                    value: brand.brand_id,
                    label: brand.name,
                  })),
                ]}
              />
            </div>

            <div className="mt-3 rounded-lg border border-white/20 bg-white/5 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/60">Selected</p>
              <p className="mt-1 text-sm font-semibold text-white">{resolveSlotSelectionLabel(slot)}</p>
            </div>
          </div>
        ))}
      </form>
    </SectionBlock>
  );

  const renderSchemeData = () => (
    <SectionBlock
      title="Scheme Basics"
      subtitle="Defina claramente os dados que orientam a geração do card final."
      className="sa-surface-header h-auto border-white/20"
    >
      <div className="mt-4 space-y-4">
        <GenerationModePanel mode={generationMode} onChange={setGenerationMode} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SchemeStepCard step="Title" icon="🧬" title="Scheme title" description="Nome principal do card final. Ex: Night Luxe Capsule." />
          <SchemeStepCard step="Description" icon="🧾" title="Description" description="Explica o conceito da composição e aumenta contexto do card." />
          <SchemeStepCard step="Style direction" icon="🎯" title="Style + mood + audience" description="Define estilo, mood, visibilidade e caso de uso." />
          <SchemeStepCard step="Visibility" icon="🌐" title="Visibility" description="Public abre descoberta; private mantém rascunho reservado." />
          <SchemeStepCard step="Impact" icon="🚀" title="Impacto no card" description="Esses dados influenciam descrição, badges e background recomendado." />
        </div>
      </div>
    </SectionBlock>
  );

  const renderAiGeneration = () => (
    <SectionBlock
      title="AI Assist"
      subtitle="A IA sugere combinações com base nos seus itens e metadata."
      className="sa-surface-header h-auto border-white/20"
    >
      <div className="mt-4 space-y-3">
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Create a premium casual daily outfit with a visual anchor in blue tones."
          className={`${inputClassName} min-h-28`}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={async () => {
              const success = await generateFromAiPrompt();
              if (success) setSelectedSection('Slots Review');
            }}
            disabled={aiInterpreting}
          >
            {aiInterpreting ? 'Interpreting...' : 'Interpretar look'}
          </button>
          <button type="button" className={secondaryButtonClassName} onClick={() => setGenerationMode('ai')}>
            Set as AI Mode
          </button>
        </div>
        {aiInterpretation ? (
          <div className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white/90">
            <p className="font-semibold text-white">Structured interpretation</p>
            <p className="mt-1 text-white/70">{aiInterpretation.description || aiInterpretation.prompt}</p>
            <ul className="mt-2 space-y-1 text-xs text-white/80">
              {aiInterpretation.items.map((item, index) => (
                <li key={`${item.display_label}-${index}`}>
                  • {item.display_label} · {item.piece_type}
                  {item.color ? ` · ${item.color}` : ''}
                  {item.material ? ` · ${item.material}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {aiError ? (
          <div className="rounded-xl border border-rose-300/50 bg-rose-500/10 p-3 text-sm text-rose-100">
            <p className="font-semibold">AI generation failed</p>
            <p className="mt-1">{aiError.message}</p>
            <p className="mt-2 text-xs text-rose-100/80">
              code: {aiError.code}
              {aiError.requestId ? ` · trace: ${aiError.requestId}` : ''}
            </p>
          </div>
        ) : null}
      </div>
    </SectionBlock>
  );

  const renderSlotsReview = () => (
    <SectionBlock
      title="Slots Review"
      subtitle="Loadout-style review for each slot with completeness feedback."
      className="sa-surface-header h-auto border-white/20"
    >
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(Object.keys(slots) as SlotKey[]).map((slot) => (
          <SlotReviewCard
            key={slot}
            slot={slot}
            icon={SLOT_ICONS[slot]}
            selected={resolveSlotSelectionLabel(slot)}
            status={slots[slot] ? 'filled' : 'empty'}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-white/75">
        Composition status: <span className="font-semibold text-white">{filledSlotsCount} of 4 slots filled</span>.
      </p>
    </SectionBlock>
  );


  const renderCardBackground = () => (
    <SectionBlock
      title="Card Background"
      subtitle="Ajuste cor, gradiente ou IA e persista no draft atual."
      className="sa-surface-header h-auto border-white/20"
    >
      <div className="mt-4">
        <button type="button" className={primaryButtonClassName} onClick={() => setBackgroundStudioOpen(true)}>
          Open Background Studio
        </button>
      </div>
    </SectionBlock>
  );

  const renderSaveGenerate = () => (
    <SectionBlock
      title="Save & Generate"
      subtitle="Final preview, validation, and generation confirmation."
      className="sa-surface-header h-auto border-white/20"
    >
      <div className="mt-4 space-y-4">
        <SaveSummaryPanel
          mode={generationMode}
          descriptionMode={descriptionMode}
          filledSlots={filledSlotsCount}
          totalSlots={4}
        />
        {!isFormValid ? (
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Quality check warning: title, style, occasion, and at least one slot are required before saving.
          </div>
        ) : null}
        <button type="button" className={primaryButtonClassName} disabled={heroImageUploading} onClick={handleFinalSave}>
          {generationMode === 'manual' ? 'Save Outfit Card' : 'Generate Outfit Card'}
        </button>
      </div>
    </SectionBlock>
  );

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <SchemeStepSidebar steps={sections} currentStep={selectedSection} completedSteps={completedSections} onSelect={setSelectedSection} />

        <div className="space-y-6">
          <PageHeader
            title="Create my Outfit Card"
            subtitle="Premium manual and AI generation paths for outfit cards."
          />

          <GenerationModePanel mode={generationMode} onChange={setGenerationMode} />

          {selectedSection === 'Scheme Basics' ? renderSchemeData() : null}
          {selectedSection === 'Build Outfit' ? renderManualBuilder() : null}
          {selectedSection === 'AI Assist' ? renderAiGeneration() : null}
          {selectedSection === 'Slots Review' ? renderSlotsReview() : null}
          {selectedSection === 'Card Background' ? renderCardBackground() : null}
          {selectedSection === 'Save & Generate' ? renderSaveGenerate() : null}

          {generatedCardData ? (
            <SectionBlock
              title="Generated Outfit Card"
              subtitle="Rendered after the final save & generate action."
              className="sa-surface-header h-auto border-white/20"
            >
              <OutfitCard data={generatedCardData} />
            </SectionBlock>
          ) : null}
        </div>
      </div>

      {alertMessage ? (
        <SaiModalAlert message={alertMessage} onConfirm={() => setAlertMessage(null)} />
      ) : null}

      {backgroundStudioOpen ? (
        <OutfitBackgroundStudioModal
          value={outfitBackgroundConfig}
          onClose={() => setBackgroundStudioOpen(false)}
          onApply={(nextBackgroundConfig) => {
            setOutfitBackgroundConfig(nextBackgroundConfig);
            setAlertMessage(`Background applied: ${nextBackgroundConfig.background_mode} · shape ${nextBackgroundConfig.shape || 'none'}`);
            setBackgroundStudioOpen(false);
          }}
          outfitMetadata={{
            style,
            occasion,
            palette,
            mood,
            brands: selectedBrand?.name ? [selectedBrand.name] : undefined,
          }}
          previewCardData={buildGeneratedOutfitCardData()}
        />
      ) : null}
    </>
  );
}
