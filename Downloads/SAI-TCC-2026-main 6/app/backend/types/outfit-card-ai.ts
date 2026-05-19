export type OutfitInterpretationInput = {
  prompt: string;
  locale?: string;
};

export type OutfitDetectedAttributes = {
  color?: string | null;
  material?: string | null;
  style?: string | null;
  occasion?: string | null;
  brand?: string | null;
  gender?: string | null;
  mood?: string | null;
};

export type OutfitDetectedItem = {
  piece_type: string;
  display_label: string;
  color?: string | null;
  material?: string | null;
  inferred_role?: string | null;
  brand?: string | null;
  confidence?: number | null;
};

export type OutfitPromptParseResponse = {
  title: string;
  description?: string;
  detectedStyleTags: string[];
  detectedOccasionTags: string[];
  gender?: string | null;
  mood?: string | null;
  items: OutfitDetectedItem[];
  warnings?: string[];
};

export type OutfitInterpretationResult = OutfitPromptParseResponse & {
  prompt: string;
  normalizedPrompt: string;
  detectedAttributes?: OutfitDetectedAttributes;
};

export type OutfitInterpretResponse = {
  success: boolean;
  data?: OutfitInterpretationResult;
  error?: string;
  error_code?: string;
  request_id?: string;
};

export type OpenAIOutfitInterpretPayload = {
  prompt: string;
  locale?: string;
};
