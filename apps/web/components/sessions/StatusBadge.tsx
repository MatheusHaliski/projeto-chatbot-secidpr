interface Props {
  status: string;
}

const CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Aberta', className: 'bg-green-100 text-green-700' },
  analyzing: { label: 'Analisando', className: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'Encerrada', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600' },
};

export default function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
