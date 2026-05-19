import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import workspaceRoutes from './workspaces';
import sessionRoutes from './sessions';
import botWebhookRoutes from './bot-webhook';
import adminRoutes from './admin';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(workspaceRoutes, { prefix: '/workspaces' });
  await server.register(sessionRoutes, { prefix: '/sessions' });
  await server.register(botWebhookRoutes, { prefix: '/webhook/bot' });
  await server.register(adminRoutes, { prefix: '/admin' });
}
