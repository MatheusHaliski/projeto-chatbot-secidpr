import { OpenAIOutfitInterpretPayload, OutfitPromptParseResponse } from '@/app/backend/types/outfit-card-ai';

const DEFAULT_TIMEOUT_MS = 30_000;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

function extractContent(json: Record<string, unknown>) {
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const first = (choices[0] ?? {}) as Record<string, unknown>;
  const message = (first.message ?? {}) as Record<string, unknown>;
  const content = message.content;
  if (typeof content !== 'string') throw new Error('OpenAI returned an invalid interpretation payload.');
  return content;
}

export class OpenAIOutfitInterpreterClient {
  async interpret(payload: OpenAIOutfitInterpretPayload): Promise<OutfitPromptParseResponse> {
    const apiKey = required('OPENAI_API_KEY');
    const model = process.env.OPENAI_TEXT_MODEL?.trim() || 'gpt-4.1-mini';
    const timeoutMs = Number(process.env.OPENAI_TEXT_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const systemPrompt = [
      'You are a fashion outfit interpreter for a card-based outfit builder.',
      'Extract clothing items from Portuguese and English text.',
      'Preserve layering order when multiple upper garments are present.',
      'Return only strict JSON with keys: title, description, detectedStyleTags, detectedOccasionTags, gender, mood, items, warnings.',
      'Each item must include: piece_type, display_label, color, material, inferred_role, brand, confidence.',
      'Do not hallucinate garments not present in prompt. Use null when unknown.',
    ].join(' ');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Locale: ${payload.locale || 'pt-BR'}\nPrompt: ${payload.prompt}` },
          ],
        }),
        signal: controller.signal,
      });

      const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const errorObj = (json.error ?? {}) as Record<string, unknown>;
        const message = typeof errorObj.message === 'string' ? errorObj.message : 'OpenAI outfit interpretation request failed.';
        throw new Error(message);
      }

      const rawContent = extractContent(json);
      const parsed = JSON.parse(rawContent) as OutfitPromptParseResponse;
      if (!parsed || !Array.isArray(parsed.items)) {
        throw new Error('OpenAI returned invalid outfit structure.');
      }

      return {
        title: parsed.title || 'AI Outfit Draft',
        description: parsed.description,
        detectedStyleTags: Array.isArray(parsed.detectedStyleTags) ? parsed.detectedStyleTags : [],
        detectedOccasionTags: Array.isArray(parsed.detectedOccasionTags) ? parsed.detectedOccasionTags : [],
        gender: parsed.gender ?? null,
        mood: parsed.mood ?? null,
        items: parsed.items,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenAI outfit interpretation timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
