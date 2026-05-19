'use client';
// Realtime sessions list using Firestore onSnapshot
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Firestore } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';

interface Session {
  id: string;
  topic: string;
  status: string;
  openedBy: string;
  openedAt: { seconds: number };
  opinionCount: number;
  workspaceId: string;
}

export function useSessions(workspaceId: string | null): {
  sessions: Session[];
  loading: boolean;
  error: string | null;
} {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const db: Firestore = getFirebaseFirestore();
    const q = query(
      collection(db, 'sessions'),
      where('workspaceId', '==', workspaceId),
      orderBy('openedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [workspaceId]);

  return { sessions, loading, error };
}
