'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Workspace {
  id: string;
  name: string;
  telegramChatId: string;
  plan: string;
  settings: {
    maxOpinionsPerSession: number;
    language: string;
    notifyOnDecision: boolean;
    allowedUserIds: string[];
  };
}

export function useWorkspace(workspaceId: string | null): {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
} {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    api
      .get<Workspace>(`/workspaces/${workspaceId}`)
      .then(setWorkspace)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return { workspace, loading, error };
}
