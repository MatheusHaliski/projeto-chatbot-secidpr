import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { getAdminFirestore } from '../config/firebase';

export default async function adminRoutes(server: FastifyInstance): Promise<void> {
  server.addHook('preHandler', requireAuth(server));
  server.addHook('preHandler', requireRole('admin'));

  const db = getAdminFirestore();

  server.get('/stats', async (_request, reply) => {
    try {
      const [workspacesSnap, sessionsSnap] = await Promise.all([
        db.collection('workspaces').count().get(),
        db.collection('sessions').count().get(),
      ]);

      const decisionsSnap = await db.collection('sessions')
        .where('status', '==', 'closed').count().get();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeSnap = await db.collection('sessions')
        .where('openedAt', '>=', today).count().get();

      return reply.send({
        success: true,
        data: {
          totalWorkspaces: workspacesSnap.data().count,
          totalSessions: sessionsSnap.data().count,
          totalDecisions: decisionsSnap.data().count,
          activeSessionsToday: activeSnap.data().count,
        },
      });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar estatísticas' });
    }
  });

  server.get('/workspaces', async (_request, reply) => {
    try {
      const snap = await db.collection('workspaces').orderBy('createdAt', 'desc').get();
      return reply.send({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar workspaces' });
    }
  });

  server.get('/audit-logs', async (request, reply) => {
    const query = request.query as { workspaceId?: string; page?: string };
    const page = parseInt(query.page ?? '1', 10);
    const pageSize = 50;

    try {
      let q = db.collection('audit_logs').orderBy('timestamp', 'desc');
      if (query.workspaceId) q = q.where('workspaceId', '==', query.workspaceId) as typeof q;

      const countSnap = await q.count().get();
      const snap = await q.offset((page - 1) * pageSize).limit(pageSize).get();

      return reply.send({
        success: true,
        data: {
          items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          total: countSnap.data().count,
          page,
          pageSize,
        },
      });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar logs de auditoria' });
    }
  });
}
