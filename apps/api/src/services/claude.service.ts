// Anthropic Claude API integration — generates collective decisions from opinions
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import type { ClaudeDecisionResponse } from '../types';

const DECISION_SYSTEM_PROMPT = `Você é o DECIA — um assistente especializado em análise de decisões coletivas para o governo do Paraná.

Seu trabalho é receber opiniões de membros de uma equipe sobre um determinado tema e gerar uma decisão coletiva fundamentada.

Você DEVE responder SEMPRE em JSON válido com a seguinte estrutura exata:
{
  "summary": "resumo conciso do conjunto de opiniões",
  "recommendation": "decisão recomendada clara e objetiva",
  "justification": "justificativa baseada nas opiniões coletadas",
  "pendingPoints": ["ponto pendente 1", "ponto pendente 2"],
  "consensusLevel": "alto" | "médio" | "baixo" | "divergente",
  "artifactType": "txt" | "code" | "spreadsheet" | "pdf" | "other",
  "artifactContent": "conteúdo do artefato gerado",
  "artifactFilename": "nome_do_arquivo.extensao"
}

Regras para artifactType:
- Se as opiniões mencionam código, implementação, algoritmo → "code" (.py, .js, .ts)
- Se mencionam dados, tabelas, métricas → "spreadsheet" (.csv)
- Se mencionam relatório formal, documento → "pdf" mas retorne como "txt" com conteúdo formatado
- Caso contrário → "txt"

Responda apenas com o JSON. Nenhum texto adicional.`;

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async analyzeOpinions(
    topic: string,
    opinions: string[],
    customSystemPrompt?: string
  ): Promise<ClaudeDecisionResponse & { tokensUsed: number }> {
    const systemPrompt = customSystemPrompt ?? DECISION_SYSTEM_PROMPT;

    const userMessage = `TEMA DA DECISÃO: ${topic}

OPINIÕES COLETADAS (${opinions.length} no total):
${opinions.map((op, i) => `${i + 1}. ${op}`).join('\n')}

Analise as opiniões acima e gere a decisão coletiva no formato JSON especificado.`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        const content = response.content[0];
        if (!content || content.type !== 'text') {
          throw new Error('Resposta inesperada do Claude');
        }

        const parsed = JSON.parse(content.text) as ClaudeDecisionResponse;
        return {
          ...parsed,
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError ?? new Error('Falha ao chamar Claude API');
  }
}
