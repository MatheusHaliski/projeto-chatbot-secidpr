'use client';
import { useEffect, useState } from 'react';
import StatsCards from '@/components/dashboard/StatsCards';
import RecentSessions from '@/components/dashboard/RecentSessions';
import { api } from '@/lib/api';

interface Stats {
  totalWorkspaces: number;
  totalSessions: number;
  totalDecisions: number;
  activeSessionsToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/admin/stats').then(setStats).catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do seu workspace</p>
      </div>
      <StatsCards stats={stats} />
      <RecentSessions />
    </div>
  );
}
