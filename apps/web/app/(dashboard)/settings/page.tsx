'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const [tokenVisible, setTokenVisible] = useState(false);
  const [token, setToken] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const workspaceId = 'current'; // In production: from context/auth

  const handleRegenerate = async () => {
    if (!confirm('Tem certeza? O token atual será revogado e o bot precisará ser reconfigurado.')) return;
    setRegenerating(true);
    try {
      const result = await api.post<{ token: string }>(`/workspaces/${workspaceId}/token`, {});
      setToken(result.token);
      setTokenVisible(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao regenerar token');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskedToken = token
    ? `${'●'.repeat(token.length - 4)}${token.slice(-4)}`
    : '●●●●●●●●●●●●xxxx';

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold">API Token</h2>
        <p className="text-gray-600 text-sm">
          Use este token para configurar o bot Telegram. Nunca compartilhe publicamente.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-800">
            {tokenVisible && token ? token : maskedToken}
          </code>
          <button
            onClick={() => setTokenVisible((v) => !v)}
            className="p-2 text-gray-500 hover:text-gray-700"
            title={tokenVisible ? 'Ocultar' : 'Revelar'}
          >
            {tokenVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          {token && (
            <button
              onClick={handleCopy}
              className="px-3 py-2 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
          >
            <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerando...' : 'Regenerar token'}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Configurar no .env do bot:</p>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
            {`WORKSPACE_API_TOKEN=${tokenVisible && token ? token : '<seu-token>'}\nAPI_BASE_URL=https://sua-api.railway.app`}
          </pre>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Zona de Perigo</h2>
        <p className="text-gray-600 text-sm mb-4">
          Ações irreversíveis. Tenha certeza antes de prosseguir.
        </p>
        <button
          onClick={() => {
            const confirmed = prompt('Digite "EXCLUIR" para confirmar a exclusão do workspace:');
            if (confirmed === 'EXCLUIR') {
              alert('Funcionalidade disponível em produção');
            }
          }}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
        >
          Excluir workspace
        </button>
      </section>
    </div>
  );
}
