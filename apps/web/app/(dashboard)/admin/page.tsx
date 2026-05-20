'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import StatsCards from '@/components/dashboard/StatsCards';

interface Stats {
  totalWorkspaces: number;
  totalSessions: number;
  totalDecisions: number;
  activeSessionsToday: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>('/admin/stats')
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
      {loading ? (
        <div className="text-gray-500">Carregando...</div>
      ) : (
        <StatsCards stats={stats} />
      )}
    </div>
  );
}
