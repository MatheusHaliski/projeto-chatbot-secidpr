import { Timestamp } from './common';

export interface WorkspaceSettings {
  maxOpinionsPerSession: number;
  language: 'pt-BR' | 'en';
  notifyOnDecision: boolean;
  allowedUserIds: string[];
  systemPrompt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  telegramChatId: string;
  ownerId: string;
  memberIds: string[];
  apiTokenHash: string;
  plan: 'free' | 'pro';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: WorkspaceSettings;
}

export interface CreateWorkspaceInput {
  name: string;
  telegramChatId: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceInput {
  name?: string;
  telegramChatId?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceTokenResponse {
  token: string;
  createdAt: string;
}
