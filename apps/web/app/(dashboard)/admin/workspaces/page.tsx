'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Workspace {
  id: string;
  name: string;
  telegramChatId: string;
  plan: string;
  createdAt: { seconds: number };
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Workspace[]>('/admin/workspaces')
      .then(setWorkspaces)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Todos os Workspaces</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm font-medium text-gray-500">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Chat ID</th>
                <th className="px-6 py-3">Plano</th>
                <th className="px-6 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((w) => (
                <tr key={w.id} className="border-b border-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{w.name}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">{w.telegramChatId}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      w.plan === 'pro' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {w.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {format(new Date(w.createdAt.seconds * 1000), "d MMM yyyy", { locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
