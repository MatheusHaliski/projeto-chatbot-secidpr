interface Decision {
  summary: string;
  recommendation: string;
  justification: string;
  pendingPoints: string[];
  consensusLevel: string;
  tokensUsed: number;
}

interface Artifact {
  type: string;
  filename: string;
  content: string;
}

interface Props {
  decision: Decision;
  artifact?: Artifact;
}

const CONSENSUS_COLORS: Record<string, string> = {
  alto: 'bg-green-100 text-green-700',
  médio: 'bg-yellow-100 text-yellow-700',
  baixo: 'bg-orange-100 text-orange-700',
  divergente: 'bg-red-100 text-red-700',
};

export default function DecisionPanel({ decision, artifact }: Props) {
  const handleDownload = () => {
    if (!artifact) return;
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Resumo</p>
        <p className="text-gray-700">{decision.summary}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Decisão Recomendada</p>
        <p className="text-gray-900 font-medium">{decision.recommendation}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Justificativa</p>
        <p className="text-gray-700">{decision.justification}</p>
      </div>
      {decision.pendingPoints.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Pontos Pendentes</p>
          <ul className="list-disc list-inside space-y-1">
            {decision.pendingPoints.map((p, i) => (
              <li key={i} className="text-gray-700">{p}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Consenso:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONSENSUS_COLORS[decision.consensusLevel] ?? 'bg-gray-100 text-gray-600'}`}>
            {decision.consensusLevel}
          </span>
        </div>
        <span className="text-xs text-gray-400">{decision.tokensUsed} tokens</span>
      </div>
      {artifact && (
        <button
          onClick={handleDownload}
          className="w-full mt-2 flex items-center justify-center gap-2 border border-primary-200 text-primary-600 rounded-lg py-2 hover:bg-primary-50 text-sm font-medium"
        >
          Baixar {artifact.filename}
        </button>
      )}
    </div>
  );
}
