// Validates API token from bot requests — looks up workspace by token hash
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getAdminFirestore } from '../config/firebase';
import { TokenService } from '../services/token.service';

export function requireToken(_server: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ success: false, error: 'Token de autorização ausente' });
      return;
    }

    const token = authHeader.slice(7);
    const tokenService = new TokenService();
    const tokenHash = await tokenService.hashToken(token);

    const db = getAdminFirestore();
    const snap = await db.collection('workspaces')
      .where('apiTokenHash', '==', tokenHash)
      .limit(1).get();

    if (snap.empty) {
      reply.status(401).send({ success: false, error: 'Token inválido ou workspace não autorizado' });
      return;
    }

    const doc = snap.docs[0]!;
    (request as typeof request & { workspace: unknown }).workspace = { id: doc.id, ...doc.data() };
  };
}
