'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy, Firestore } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';
import { api } from '@/lib/api';
import OpinionsList from '@/components/sessions/OpinionsList';
import DecisionPanel from '@/components/sessions/DecisionPanel';
import StatusBadge from '@/components/sessions/StatusBadge';

interface Session {
  id: string;
  topic: string;
  status: string;
  openedBy: string;
  openedAt: { seconds: number };
  decision?: {
    summary: string;
    recommendation: string;
    justification: string;
    pendingPoints: string[];
    consensusLevel: string;
    tokensUsed: number;
  };
  artifact?: {
    type: string;
    filename: string;
    content: string;
  };
}

interface Opinion {
  id: string;
  author: string;
  content: string;
  timestamp: { seconds: number };
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const db: Firestore = getFirebaseFirestore();
    const sessionUnsub = onSnapshot(doc(db, 'sessions', id), (snap) => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() } as Session);
    });

    const opinionsUnsub = onSnapshot(
      query(collection(db, 'sessions', id, 'opinions'), orderBy('timestamp', 'asc')),
      (snap) => setOpinions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Opinion)))
    );

    return () => { sessionUnsub(); opinionsUnsub(); };
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/sessions/${id}/analyze`, {});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao analisar');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!session) {
    return <div className="p-8 text-center text-gray-500">Carregando sessão...</div>;
  }

  const isLive = session.status === 'open' || session.status === 'analyzing';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={session.status} />
            {isLive && (
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                ao vivo
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{session.topic}</h1>
          <p className="text-gray-500 text-sm mt-1">Aberta por {session.openedBy}</p>
        </div>
        {session.status === 'open' && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing || opinions.length < 2}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {analyzing ? 'Analisando...' : 'Analisar agora'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">
            Opiniões ({opinions.length})
          </h2>
          <OpinionsList opinions={opinions} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Decisão Gerada</h2>
          {session.decision ? (
            <DecisionPanel decision={session.decision} artifact={session.artifact} />
          ) : (
            <p className="text-gray-500 text-sm">
              {session.status === 'analyzing'
                ? '⏳ Analisando com IA...'
                : 'Nenhuma decisão gerada ainda.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
