import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAdminAuth } from '../config/firebase';

const verifyTokenSchema = z.object({
  idToken: z.string().min(1),
});

export default async function authRoutes(server: FastifyInstance): Promise<void> {
  server.post('/verify-token', async (request, reply) => {
    const body = verifyTokenSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Invalid request body' });
    }

    try {
      const auth = getAdminAuth();
      const decoded = await auth.verifyIdToken(body.data.idToken);

      const token = server.jwt.sign({
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role ?? 'member',
        workspaceIds: decoded.workspaceIds ?? [],
      });

      const refreshToken = server.jwt.sign(
        { uid: decoded.uid, type: 'refresh' },
        { expiresIn: '7d' }
      );

      return reply.send({ success: true, data: { token, refreshToken } });
    } catch {
      return reply.status(401).send({ success: false, error: 'Token inválido ou expirado' });
    }
  });

  server.post('/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Refresh token obrigatório' });
    }

    try {
      const payload = server.jwt.verify<{ uid: string; type: string }>(body.data.refreshToken);
      if (payload.type !== 'refresh') {
        return reply.status(401).send({ success: false, error: 'Token inválido' });
      }

      const auth = getAdminAuth();
      const user = await auth.getUser(payload.uid);
      const customClaims = user.customClaims ?? {};

      const token = server.jwt.sign({
        uid: payload.uid,
        email: user.email,
        role: customClaims['role'] ?? 'member',
        workspaceIds: customClaims['workspaceIds'] ?? [],
      });

      return reply.send({ success: true, data: { token } });
    } catch {
      return reply.status(401).send({ success: false, error: 'Refresh token inválido' });
    }
  });
}
