import { GoogleGenAI } from '@google/genai';
import {
  FashionAIProvider,
  AnalyzeImageInput,
  AnalyzeImageOutput,
  CardDescriptionInput,
  CardDescriptionOutput,
  TesterFitInput,
  TesterFitOutput,
  BackgroundPromptInput,
  BackgroundPromptOutput,
  SearchIntentInput,
  SearchIntentOutput,
} from './types';

export class GoogleProvider implements FashionAIProvider {
  private ai: GoogleGenAI;
  private textModel: string;
  private visionModel: string;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is missing');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.textModel = process.env.GOOGLE_AI_MODEL_TEXT || 'gemini-2.5-pro';
    this.visionModel = process.env.GOOGLE_AI_MODEL_VISION || 'gemini-2.5-pro';
  }

  private async generateJson<T>(model: string, prompt: string, imageBase64?: string, imageMimeType?: string): Promise<T> {
    try {
      const contents: any[] = [];
      
      if (imageBase64 && imageMimeType) {
        // Remove the data:image/...;base64, prefix if present
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        contents.push({
          inlineData: {
            data: cleanBase64,
            mimeType: imageMimeType,
          }
        });
      }
      
      contents.push(prompt);

      const response = await this.ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text || '';
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      }
      return JSON.parse(cleanText) as T;
    } catch (error) {
      console.error('[GoogleProvider] Error generating JSON content:', error);
      throw error;
    }
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
    const prompt = `You are a high-end fashion AI expert. Analyze the provided clothing image.
Return a strictly formatted JSON object with the following fields:
- pieceName: A premium, short name for the item.
- category: The exact type of item (e.g. "Blazer", "T-Shirt", "Sneakers").
- bodyRegion: Must be exactly one of: "upper", "lower", "shoes", "accessory", "unknown".
- primaryColor: The main color name (e.g. "Navy Blue").
- secondaryColors: Array of string colors.
- materials: Array of likely materials (e.g. ["Cotton", "Polyester"]).
- styles: Array of styles (e.g. ["casual", "streetwear", "formal", "luxury"]).
- season: Must be exactly one of: "summer", "winter", "spring", "autumn", "all-season", "unknown".
- gender: Must be exactly one of: "male", "female", "unisex", "unknown".
- brand: Likely brand if recognizable, or "Unknown".
- brandConfidence: "High", "Medium", or "Low".
- semanticTags: Array of 5-8 descriptive tags useful for search.
- shortDescription: A 1-2 sentence premium description.
- outfitSuggestions: Array of 2-3 items that would pair well.

Only return the JSON.`;

    return this.generateJson<AnalyzeImageOutput>(
      this.visionModel,
      prompt,
      input.base64Image,
      input.mimeType || 'image/jpeg'
    );
  }

  async generateCardDescription(input: CardDescriptionInput): Promise<CardDescriptionOutput> {
    const prompt = `You are a luxury fashion editorial director. Create a premium outfit description based on the following input:
${JSON.stringify(input, null, 2)}

Return a strictly formatted JSON object with the following fields:
- editorialTitle: A catchy, premium title for the look.
- shortDescription: 1-2 sentence summary.
- longDescription: A detailed, engaging editorial description explaining why it works. Focus on styling, not numerical scores.
- dominantStyle: The overall vibe.
- colorHarmony: Brief description of how the colors interact.
- strongPoints: Array of 3 string highlights.
- anchorPiece: The standout piece from the list.
- idealBackgroundSuggestion: Brief suggestion for a studio background.
- category: Exactly one of: "Standard", "Premium", "Limited Edition".
- wearstyles: Array of objects with "pieceName" and "styles" (max 3 styles per piece).

Only return the JSON.`;

    return this.generateJson<CardDescriptionOutput>(this.textModel, prompt);
  }

  async generateTesterFitInstructions(input: TesterFitInput): Promise<TesterFitOutput> {
    const prompt = `You are an expert virtual fitting AI. Given the following piece information:
${JSON.stringify(input, null, 2)}

Determine how it should be fit onto a 2D mannequin.
Return a strictly formatted JSON object with the following fields:
- targetBodyRegion: E.g., "upper", "lower".
- suggestedLayer: E.g., "base", "mid", "outer".
- fitType: Must be exactly one of: "slim", "regular", "oversized", "cropped", "long", "unknown".
- alignmentHint: Natural language hint for X/Y alignment.
- scaleHint: Natural language hint for scaling.
- warnings: Array of strings if the input might have issues (e.g. "Might clip with standard trousers").

Only return the JSON.`;

    return this.generateJson<TesterFitOutput>(this.textModel, prompt);
  }

  async generateBackgroundPrompt(input: BackgroundPromptInput): Promise<BackgroundPromptOutput> {
    const prompt = `You are an AI generating editorial fashion backgrounds. User request: "${input.userPrompt}"
Interpret the request and return a strictly formatted JSON object:
- backgroundType: Exactly one of: "gradient", "fabric", "metallic", "liquidGlass", "tiledMotif", "editorial", "unknown".
- palette: Array of hex colors or color names.
- texture: Short description of texture.
- composition: Short description of layout.
- cssSuggestion: A valid CSS background string (e.g. "linear-gradient(...)").
- promptForImageGeneration: A detailed prompt suitable for a text-to-image model (like Imagen).
- uiSafety: Object with "textColor" ("white" or "black") and "contrastWarning" (boolean).

Only return the JSON.`;

    return this.generateJson<BackgroundPromptOutput>(this.textModel, prompt);
  }

  async parseSearchIntent(input: SearchIntentInput): Promise<SearchIntentOutput> {
    const prompt = `You are a semantic search parser for a fashion wardrobe. User query: "${input.query}"
Extract intents into a strictly formatted JSON object with arrays of strings for:
- colors
- style
- occasion
- season
- piece_item
- brand
- gender
- semanticTags (any other keywords)

Return empty arrays if not found. Only return the JSON.`;

    return this.generateJson<SearchIntentOutput>(this.textModel, prompt);
  }
}
