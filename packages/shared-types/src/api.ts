export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BotWebhookPayload {
  action: 'open_session' | 'add_opinion' | 'analyze' | 'cancel_session' | 'get_status';
  chatId: string;
  workspaceId?: string;
  topic?: string;
  openedBy?: string;
  author?: string;
  authorId?: string;
  content?: string;
  sessionId?: string;
}

export interface AdminStats {
  totalWorkspaces: number;
  totalSessions: number;
  totalDecisions: number;
  activeSessionsToday: number;
  totalTokensUsed: number;
}
