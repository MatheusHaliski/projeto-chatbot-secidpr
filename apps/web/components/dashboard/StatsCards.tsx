interface Stats {
  totalWorkspaces?: number;
  totalSessions?: number;
  totalDecisions?: number;
  activeSessionsToday?: number;
}

interface Props {
  stats: Stats | null;
}

const CARDS = [
  { key: 'totalSessions', label: 'Total de Sessões', color: 'text-blue-600' },
  { key: 'activeSessionsToday', label: 'Sessões Hoje', color: 'text-green-600' },
  { key: 'totalDecisions', label: 'Decisões Geradas', color: 'text-purple-600' },
  { key: 'totalWorkspaces', label: 'Workspaces', color: 'text-orange-600' },
] as const;

export default function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, color }) => (
        <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>
            {stats ? (stats[key] ?? 0) : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}
