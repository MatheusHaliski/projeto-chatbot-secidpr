import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Opinion {
  id: string;
  author: string;
  content: string;
  timestamp: { seconds: number };
}

interface Props {
  opinions: Opinion[];
}

export default function OpinionsList({ opinions }: Props) {
  if (opinions.length === 0) {
    return <p className="text-gray-400 text-sm">Nenhuma opinião registrada ainda.</p>;
  }

  return (
    <div className="space-y-4">
      {opinions.map((op) => (
        <div key={op.id} className="flex gap-3">
          <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            {op.author[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{op.author}</span>
              <span className="text-xs text-gray-400">
                {format(new Date(op.timestamp.seconds * 1000), "HH:mm", { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm text-gray-700 break-words">{op.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
