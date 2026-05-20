import { Timestamp } from './common';

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  workspaceIds: string[];
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
}
