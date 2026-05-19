import { TokenService } from '../services/token.service';

// Minimal env for tests
process.env['JWT_SECRET'] = 'test-secret-32-chars-long-enough!!';
process.env['API_TOKEN_SALT'] = 'test-salt-16chars!';
process.env['FIREBASE_PROJECT_ID'] = 'test';
process.env['FIREBASE_CLIENT_EMAIL'] = 'test@test.com';
process.env['FIREBASE_PRIVATE_KEY'] = 'test';
process.env['ANTHROPIC_API_KEY'] = 'sk-test';

describe('TokenService', () => {
  const service = new TokenService();

  it('generates a token and its hash', async () => {
    const { plainToken, tokenHash } = await service.generateToken();
    expect(plainToken).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(plainToken).not.toBe(tokenHash);
  });

  it('produces consistent hash for same token', async () => {
    const { plainToken } = await service.generateToken();
    const hash1 = await service.hashToken(plainToken);
    const hash2 = await service.hashToken(plainToken);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different tokens', async () => {
    const { plainToken: t1 } = await service.generateToken();
    const { plainToken: t2 } = await service.generateToken();
    const h1 = await service.hashToken(t1);
    const h2 = await service.hashToken(t2);
    expect(h1).not.toBe(h2);
  });
});
