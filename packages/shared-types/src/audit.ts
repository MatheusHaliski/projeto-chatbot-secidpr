import { Timestamp } from './common';

export type ActorType = 'user' | 'bot' | 'system';

export interface AuditLog {
  id: string;
  workspaceId: string;
  action: string;
  actorId: string;
  actorType: ActorType;
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
}
