'use client';
import { useSessions } from '@/hooks/useSessions';
import StatusBadge from '@/components/sessions/StatusBadge';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RecentSessions() {
  const { sessions, loading } = useSessions(null);
  const recent = sessions.slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Sessões Recentes</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : recent.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhuma sessão encontrada.</p>
      ) : (
        <div className="space-y-3">
          {recent.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <StatusBadge status={s.status} />
                <span className="text-sm text-gray-900 truncate">{s.topic}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  {format(new Date(s.openedAt.seconds * 1000), "d MMM", { locale: ptBR })}
                </span>
                <Link href={`/sessions/${s.id}`} className="text-xs text-primary-600 hover:underline">
                  Ver
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
