import { FastifyInstance } from 'fastify';
import corsPlugin from './cors';
import helmetPlugin from './helmet';
import jwtPlugin from './jwt';
import rateLimitPlugin from './rateLimit';

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  await corsPlugin(server);
  await helmetPlugin(server);
  await jwtPlugin(server);
  await rateLimitPlugin(server);
}
