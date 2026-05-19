'use client';
// Global authentication state — provides user + loading state across the app
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getIdToken } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        try {
          const idToken = await getIdToken();
          if (idToken) {
            const result = await api.post<{ token: string }>('/auth/verify-token', { idToken });
            document.cookie = `access_token=${result.token}; path=/; max-age=3600; SameSite=Strict`;
          }
        } catch {
          // Token exchange failure is non-fatal — user stays logged in to Firebase
        }
      } else {
        document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      setState({ user, loading: false });
    });

    return unsubscribe;
  }, []);

  return state;
}
