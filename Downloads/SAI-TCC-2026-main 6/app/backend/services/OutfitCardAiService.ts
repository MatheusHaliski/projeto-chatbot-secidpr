import { OpenAIOutfitInterpreterClient } from '@/app/backend/integrations/openai/OpenAIOutfitInterpreterClient';
import { ServiceError } from '@/app/backend/services/errors';
import { OutfitInterpretationInput, OutfitInterpretationResult } from '@/app/backend/types/outfit-card-ai';
import {
  buildOutfitCardDraftFromPrompt,
  normalizeDetectedColor,
  normalizeDetectedMaterial,
  normalizeDetectedPieceType,
  normalizeTagList,
} from '@/app/lib/outfit-ai-mapping';
import { OCCASION_TAG_SYNONYMS, STYLE_TAG_SYNONYMS } from '@/app/lib/outfit-piece-options';

export class OutfitCardAiService {
  constructor(private readonly client = new OpenAIOutfitInterpreterClient()) {}

  private validateInput(input: OutfitInterpretationInput) {
    if (!input.prompt?.trim()) {
      throw new ServiceError('Digite um prompt para interpretar o look.', 400);
    }
  }

  async interpret(input: OutfitInterpretationInput): Promise<OutfitInterpretationResult> {
    this.validateInput(input);

    const prompt = input.prompt.trim();
    const normalizedPrompt = prompt.toLowerCase().replace(/\s+/g, ' ');

    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new ServiceError('OPENAI_API_KEY não configurada. Tente novamente mais tarde.', 503);
    }

    try {
      const raw = await this.client.interpret({ prompt, locale: input.locale });
      return {
        prompt,
        normalizedPrompt,
        title: raw.title,
        description: raw.description,
        detectedStyleTags: normalizeTagList(raw.detectedStyleTags, STYLE_TAG_SYNONYMS),
        detectedOccasionTags: normalizeTagList(raw.detectedOccasionTags, OCCASION_TAG_SYNONYMS),
        gender: raw.gender ?? null,
        mood: raw.mood ?? null,
        items: raw.items.map((item) => ({
          ...item,
          piece_type: normalizeDetectedPieceType(item.piece_type || item.display_label) || item.piece_type || 'upper',
          color: normalizeDetectedColor(item.color || item.display_label),
          material: normalizeDetectedMaterial(item.material || item.display_label),
          inferred_role: item.inferred_role ?? null,
          confidence: item.confidence ?? null,
        })),
        warnings: raw.warnings,
      };
    } catch (error) {
      console.warn('outfit-card-ai: using heuristic fallback', {
        error: error instanceof Error ? error.message : 'unknown',
      });

      const fallback = buildOutfitCardDraftFromPrompt(prompt);
      return {
        prompt,
        normalizedPrompt,
        ...fallback,
      };
    }
  }
}
