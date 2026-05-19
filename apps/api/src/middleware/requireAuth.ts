import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function requireAuth(server: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ success: false, error: 'Autenticação necessária' });
    }
  };
}
