// Environment variable validation using zod — fails fast if required vars are missing
import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32),
  API_TOKEN_SALT: z.string().min(16),
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
