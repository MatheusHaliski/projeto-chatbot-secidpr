export interface AnalyzeImageInput {
  imageUrl?: string;
  base64Image?: string;
  mimeType?: string;
}

export interface AnalyzeImageOutput {
  pieceName: string;
  category: string;
  bodyRegion: 'upper' | 'lower' | 'shoes' | 'accessory' | 'unknown';
  primaryColor: string;
  secondaryColors: string[];
  materials: string[];
  styles: string[];
  season: 'summer' | 'winter' | 'spring' | 'autumn' | 'all-season' | 'unknown';
  gender: 'male' | 'female' | 'unisex' | 'unknown';
  brand?: string;
  brandConfidence?: 'High' | 'Medium' | 'Low';
  semanticTags: string[];
  shortDescription: string;
  outfitSuggestions: string[];
}

export interface CardDescriptionInput {
  pieces: Array<{
    name: string;
    brand?: string;
    category?: string;
    styles?: string[];
  }>;
  overallColors: string[];
  dominantStyle: string;
  season: string;
  userIntent?: string;
  occasion?: string;
}

export interface CardDescriptionOutput {
  editorialTitle: string;
  shortDescription: string;
  longDescription: string;
  dominantStyle: string;
  colorHarmony: string;
  strongPoints: string[];
  anchorPiece: string;
  idealBackgroundSuggestion: string;
  category: 'Standard' | 'Premium' | 'Limited Edition';
  wearstyles: Array<{ pieceName: string; styles: string[] }>;
}

export interface TesterFitInput {
  pieceName: string;
  category: string;
  bodyRegion: string;
  imageSpecs?: { width: number; height: number };
}

export interface TesterFitOutput {
  targetBodyRegion: string;
  suggestedLayer: string;
  fitType: 'slim' | 'regular' | 'oversized' | 'cropped' | 'long' | 'unknown';
  alignmentHint: string;
  scaleHint: string;
  warnings: string[];
}

export interface BackgroundPromptInput {
  userPrompt: string;
}

export interface BackgroundPromptOutput {
  backgroundType: 'gradient' | 'fabric' | 'metallic' | 'liquidGlass' | 'tiledMotif' | 'editorial' | 'unknown';
  palette: string[];
  texture: string;
  composition: string;
  cssSuggestion: string;
  promptForImageGeneration: string;
  uiSafety: {
    textColor: 'white' | 'black';
    contrastWarning: boolean;
  };
}

export interface SearchIntentInput {
  query: string;
}

export interface SearchIntentOutput {
  colors: string[];
  style: string[];
  occasion: string[];
  season: string[];
  piece_item: string[];
  brand: string[];
  gender: string[];
  semanticTags: string[];
}

export interface FashionAIProvider {
  analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput>;
  generateCardDescription(input: CardDescriptionInput): Promise<CardDescriptionOutput>;
  generateTesterFitInstructions(input: TesterFitInput): Promise<TesterFitOutput>;
  generateBackgroundPrompt(input: BackgroundPromptInput): Promise<BackgroundPromptOutput>;
  parseSearchIntent(input: SearchIntentInput): Promise<SearchIntentOutput>;
}
