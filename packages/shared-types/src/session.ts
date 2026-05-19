import { Timestamp } from './common';

export type SessionStatus = 'open' | 'analyzing' | 'closed' | 'cancelled';
export type ConsensusLevel = 'alto' | 'médio' | 'baixo' | 'divergente';
export type ArtifactType = 'txt' | 'pdf' | 'code' | 'spreadsheet' | 'other';

export interface Opinion {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: Timestamp;
}

export interface Decision {
  summary: string;
  recommendation: string;
  justification: string;
  pendingPoints: string[];
  consensusLevel: ConsensusLevel;
  generatedAt: Timestamp;
  tokensUsed: number;
}

export interface Artifact {
  type: ArtifactType;
  filename: string;
  content: string;
  storageUrl?: string;
  generatedAt: Timestamp;
}

export interface Session {
  id: string;
  workspaceId: string;
  telegramChatId: string;
  topic: string;
  status: SessionStatus;
  openedBy: string;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  decision?: Decision;
  artifact?: Artifact;
  opinionCount: number;
}

export interface CreateSessionInput {
  workspaceId: string;
  telegramChatId: string;
  topic: string;
  openedBy: string;
}

export interface AddOpinionInput {
  sessionId: string;
  author: string;
  authorId: string;
  content: string;
}

export interface ClaudeDecisionResponse {
  summary: string;
  recommendation: string;
  justification: string;
  pendingPoints: string[];
  consensusLevel: ConsensusLevel;
  artifactType: ArtifactType;
  artifactContent: string;
  artifactFilename: string;
}
