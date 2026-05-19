import { FastifyInstance } from 'fastify';
import fastifyHelmet from '@fastify/helmet';

export default async function helmetPlugin(server: FastifyInstance): Promise<void> {
  await server.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  });
}
