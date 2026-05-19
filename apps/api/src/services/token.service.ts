// Generates and validates workspace API tokens — stored as SHA-256 hashes
import crypto from 'crypto';
import { env } from '../config/env';

export class TokenService {
  async generateToken(): Promise<{ plainToken: string; tokenHash: string }> {
    const randomBytes = crypto.randomBytes(32);
    const plainToken = randomBytes.toString('base64url');
    const tokenHash = await this.hashToken(plainToken);
    return { plainToken, tokenHash };
  }

  async hashToken(token: string): Promise<string> {
    return crypto
      .createHmac('sha256', env.API_TOKEN_SALT)
      .update(token)
      .digest('hex');
  }
}
