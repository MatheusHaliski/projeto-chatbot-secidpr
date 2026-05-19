import { FastifyReply, FastifyRequest } from 'fastify';

export function requireRole(requiredRole: 'admin' | 'member') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as { role: string } | undefined;
    if (!user || user.role !== requiredRole) {
      reply.status(403).send({ success: false, error: 'Permissão insuficiente' });
    }
  };
}
