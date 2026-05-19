import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { env } from '../config/env';

export default async function corsPlugin(server: FastifyInstance): Promise<void> {
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim());

  await server.register(fastifyCors, {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Bot-Version', 'X-Chat-Id'],
    credentials: true,
  });
}
