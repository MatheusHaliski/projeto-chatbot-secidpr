// Fastify server entry point — initializes plugins, routes, and starts listening
import Fastify from 'fastify';
import { registerPlugins } from './plugins';
import { registerRoutes } from './routes';
import { env } from './config/env';

const server = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

async function start(): Promise<void> {
  try {
    await registerPlugins(server);
    await registerRoutes(server);

    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`DECIA API running on port ${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
