export interface ClaudeDecisionResponse {
  summary: string;
  recommendation: string;
  justification: string;
  pendingPoints: string[];
  consensusLevel: 'alto' | 'médio' | 'baixo' | 'divergente';
  artifactType: 'txt' | 'pdf' | 'code' | 'spreadsheet' | 'other';
  artifactContent: string;
  artifactFilename: string;
}
