import { FashionAIProvider, AnalyzeImageInput, CardDescriptionInput, TesterFitInput, BackgroundPromptInput, SearchIntentInput } from './providers/types';
import { GoogleProvider } from './providers/googleProvider';
import { FallbackProvider } from './providers/fallbackProvider';

class GoogleFashionAI {
  private provider: FashionAIProvider;

  constructor() {
    const isGoogleEnabled = process.env.GOOGLE_AI_PROVIDER_ENABLED === 'true';
    const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;

    if (isGoogleEnabled && hasApiKey) {
      try {
        this.provider = new GoogleProvider();
        console.log('[GoogleFashionAI] Initialized with GoogleProvider');
      } catch (error) {
        console.error('[GoogleFashionAI] Failed to initialize GoogleProvider, falling back to mock.', error);
        this.provider = new FallbackProvider();
      }
    } else {
      console.log('[GoogleFashionAI] Google AI disabled or API key missing. Initialized with FallbackProvider');
      this.provider = new FallbackProvider();
    }
  }

  async analyzeFashionImage(input: AnalyzeImageInput) {
    return this.provider.analyzeImage(input);
  }

  async generateCardOutfitDescription(input: CardDescriptionInput) {
    return this.provider.generateCardDescription(input);
  }

  async generateTester2DFitInstructions(input: TesterFitInput) {
    return this.provider.generateTesterFitInstructions(input);
  }

  async generateBackgroundPrompt(input: BackgroundPromptInput) {
    return this.provider.generateBackgroundPrompt(input);
  }

  async parseSearchIntent(input: SearchIntentInput) {
    return this.provider.parseSearchIntent(input);
  }
}

// Export a singleton instance
export const googleFashionAI = new GoogleFashionAI();
