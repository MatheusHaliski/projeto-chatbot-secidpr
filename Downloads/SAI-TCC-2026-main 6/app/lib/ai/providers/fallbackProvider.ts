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

export class FallbackProvider implements FashionAIProvider {
  async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
    console.warn('[FallbackProvider] Returning mock data for analyzeImage');
    return {
      pieceName: 'Unknown Piece',
      category: 'T-Shirt',
      bodyRegion: 'upper',
      primaryColor: '#000000',
      secondaryColors: [],
      materials: ['Cotton'],
      styles: ['Casual'],
      season: 'all-season',
      gender: 'unisex',
      brand: 'Unknown',
      brandConfidence: 'Low',
      semanticTags: ['casual', 't-shirt'],
      shortDescription: 'A standard piece of clothing.',
      outfitSuggestions: ['Jeans', 'Sneakers'],
    };
  }

  async generateCardDescription(input: CardDescriptionInput): Promise<CardDescriptionOutput> {
    console.warn('[FallbackProvider] Returning mock data for generateCardDescription');
    return {
      editorialTitle: 'Essential Look',
      shortDescription: 'A classic and versatile outfit.',
      longDescription: 'This outfit combines essential pieces for a timeless and versatile look suitable for various occasions.',
      dominantStyle: input.dominantStyle || 'Casual',
      colorHarmony: 'Neutral',
      strongPoints: ['Versatility', 'Comfort'],
      anchorPiece: input.pieces[0]?.name || 'Top',
      idealBackgroundSuggestion: 'A minimal grey studio background.',
      category: 'Standard',
      wearstyles: input.pieces.map((p) => ({ pieceName: p.name, styles: p.styles || ['Casual'] })),
    };
  }

  async generateTesterFitInstructions(input: TesterFitInput): Promise<TesterFitOutput> {
    console.warn('[FallbackProvider] Returning mock data for generateTesterFitInstructions');
    return {
      targetBodyRegion: input.bodyRegion || 'upper',
      suggestedLayer: 'base',
      fitType: 'regular',
      alignmentHint: 'Center on the mannequin.',
      scaleHint: 'Adjust to fit the torso width.',
      warnings: ['Fallback mode: AI fitting is not fully precise.'],
    };
  }

  async generateBackgroundPrompt(input: BackgroundPromptInput): Promise<BackgroundPromptOutput> {
    console.warn('[FallbackProvider] Returning mock data for generateBackgroundPrompt');
    return {
      backgroundType: 'gradient',
      palette: ['#1a1a1a', '#333333'],
      texture: 'smooth',
      composition: 'linear-gradient(to bottom, #1a1a1a, #333333)',
      cssSuggestion: 'background: linear-gradient(to bottom, #1a1a1a, #333333);',
      promptForImageGeneration: 'A smooth dark grey gradient background.',
      uiSafety: {
        textColor: 'white',
        contrastWarning: false,
      },
    };
  }

  async parseSearchIntent(input: SearchIntentInput): Promise<SearchIntentOutput> {
    console.warn('[FallbackProvider] Returning mock data for parseSearchIntent');
    return {
      colors: [],
      style: [],
      occasion: [],
      season: [],
      piece_item: [],
      brand: [],
      gender: [],
      semanticTags: input.query.split(' ').filter(w => w.length > 3),
    };
  }
}
