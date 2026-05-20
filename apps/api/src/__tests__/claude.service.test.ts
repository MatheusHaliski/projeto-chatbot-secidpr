import { ClaudeService } from '../services/claude.service';

process.env['JWT_SECRET'] = 'test-secret-32-chars-long-enough!!';
process.env['API_TOKEN_SALT'] = 'test-salt-16chars!';
process.env['FIREBASE_PROJECT_ID'] = 'test';
process.env['FIREBASE_CLIENT_EMAIL'] = 'test@test.com';
process.env['FIREBASE_PRIVATE_KEY'] = 'test';
process.env['ANTHROPIC_API_KEY'] = 'sk-test';

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Resumo de teste',
              recommendation: 'Recomendação de teste',
              justification: 'Justificativa de teste',
              pendingPoints: ['Ponto 1'],
              consensusLevel: 'alto',
              artifactType: 'txt',
              artifactContent: 'Conteúdo do artefato',
              artifactFilename: 'decisao.txt',
            }),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    },
  })),
}));

describe('ClaudeService', () => {
  const service = new ClaudeService();

  it('returns structured decision from opinions', async () => {
    const result = await service.analyzeOpinions('Tema de teste', [
      'Opinião 1: devemos implementar X',
      'Opinião 2: concordo com X',
    ]);

    expect(result.summary).toBe('Resumo de teste');
    expect(result.recommendation).toBe('Recomendação de teste');
    expect(result.consensusLevel).toBe('alto');
    expect(result.tokensUsed).toBe(300);
  });
});
