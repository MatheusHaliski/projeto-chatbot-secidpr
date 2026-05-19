import { OpenAIArtworkGenerationPayload, OpenAIArtworkGenerationResult } from '@/app/backend/types/artwork-studio';

const DEFAULT_TIMEOUT_MS = 45_000;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

function parseGenerationResponse(payload: Record<string, unknown>, model: string): OpenAIArtworkGenerationResult {
  const data = Array.isArray(payload.data) ? payload.data : [];
  const first = (data[0] ?? {}) as Record<string, unknown>;
  const imageBase64 =
    (typeof first.b64_json === 'string' && first.b64_json) ||
    (typeof first.base64 === 'string' && first.base64) ||
    '';
  if (!imageBase64) {
    throw new Error('OpenAI returned an empty image response.');
  }

  return {
    imageBase64,
    model,
    revisedPrompt: typeof first.revised_prompt === 'string' ? first.revised_prompt : null,
  };
}

export class OpenAIArtworkClient {
  async generate(payload: OpenAIArtworkGenerationPayload): Promise<OpenAIArtworkGenerationResult> {
    const apiKey = required('OPENAI_API_KEY');
    const preferredModel = process.env.OPENAI_IMAGES_MODEL?.trim() || 'gpt-image-1.5';
    const fallbackModel = process.env.OPENAI_IMAGES_FALLBACK_MODEL?.trim() || 'gpt-image-1';
    const timeoutMs = Number(process.env.OPENAI_IMAGES_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    const tryModel = async (model: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: `${payload.prompt}\n\nNegative instructions: ${payload.negativePrompt}`,
            size: `${payload.width}x${payload.height}`,
            quality: payload.quality,
            response_format: 'b64_json',
            output_format: 'png',
          }),
          signal: controller.signal,
        });

        const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          const msg =
            (typeof (json.error as Record<string, unknown> | undefined)?.message === 'string' && (json.error as Record<string, unknown>).message as string)
            || (typeof json.message === 'string' ? json.message : `OpenAI image request failed (${response.status}).`);
          throw new Error(msg);
        }

        return parseGenerationResponse(json, model);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('OpenAI image request timed out.');
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      return await tryModel(preferredModel);
    } catch (error) {
      console.warn('openai-artwork preferred model failed, trying fallback', { error: error instanceof Error ? error.message : 'unknown' });
      if (fallbackModel === preferredModel) throw error;
      return tryModel(fallbackModel);
    }
  }
}
