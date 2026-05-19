'use client';
import { useState } from 'react';
import { useSessions } from '@/hooks/useSessions';
import StatusBadge from '@/components/sessions/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

const STATUS_OPTIONS = ['all', 'open', 'analyzing', 'closed', 'cancelled'] as const;

export default function SessionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // For demo — in production this would come from workspace context
  const { sessions, loading } = useSessions(null);

  const filtered = sessions
    .filter((s) => statusFilter === 'all' || s.status === statusFilter)
    .filter((s) => s.topic.toLowerCase().includes(search.toLowerCase()));

  const pageSize = 10;
  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sessões</h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Buscar por tema..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma sessão encontrada</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm font-medium text-gray-500">
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Tema</th>
                <th className="px-6 py-3">Aberta por</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Opiniões</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((session) => (
                <tr key={session.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4"><StatusBadge status={session.status} /></td>
                  <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">{session.topic}</td>
                  <td className="px-6 py-4 text-gray-600">{session.openedBy}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {format(new Date(session.openedAt.seconds * 1000), "d MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{session.opinionCount}</td>
                  <td className="px-6 py-4">
                    <Link href={`/sessions/${session.id}`} className="text-primary-600 hover:underline text-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-gray-600">
            {page} / {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
