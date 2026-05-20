import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';
import { getAdminFirestore } from '../config/firebase';
import { DecisionService } from '../services/decision.service';
import { AuditService } from '../services/audit.service';

export default async function sessionRoutes(server: FastifyInstance): Promise<void> {
  server.addHook('preHandler', requireAuth(server));

  const db = getAdminFirestore();
  const decisionService = new DecisionService();
  const auditService = new AuditService();

  server.get('/:id', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };

    try {
      const doc = await db.collection('sessions').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Sessão não encontrada' });

      const data = doc.data()!;
      const workspaceDoc = await db.collection('workspaces').doc(data['workspaceId']).get();
      const wData = workspaceDoc.data()!;

      if (user.role !== 'admin' && !wData['memberIds']?.includes(user.uid)) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      const opinionsSnap = await db.collection('sessions').doc(id).collection('opinions')
        .orderBy('timestamp', 'asc').get();
      const opinions = opinionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return reply.send({ success: true, data: { id: doc.id, ...data, opinions } });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar sessão' });
    }
  });

  server.post('/:id/analyze', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };

    try {
      const doc = await db.collection('sessions').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Sessão não encontrada' });

      const data = doc.data()!;
      const workspaceDoc = await db.collection('workspaces').doc(data['workspaceId']).get();
      const wData = workspaceDoc.data()!;

      if (user.role !== 'admin' && !wData['memberIds']?.includes(user.uid)) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      if (data['status'] !== 'open') {
        return reply.status(400).send({ success: false, error: 'Sessão não está aberta para análise' });
      }

      const opinionsSnap = await db.collection('sessions').doc(id).collection('opinions').get();
      if (opinionsSnap.size < 2) {
        return reply.status(400).send({ success: false, error: 'Mínimo de 2 opiniões necessário' });
      }

      await db.collection('sessions').doc(id).update({ status: 'analyzing' });

      const opinions = opinionsSnap.docs.map((d) => d.data()['content'] as string);
      const result = await decisionService.analyze(id, data['topic'] as string, opinions);

      await auditService.log({
        workspaceId: data['workspaceId'] as string,
        action: 'session.analyzed',
        actorId: user.uid,
        actorType: 'user',
        metadata: { sessionId: id, tokensUsed: result.decision.tokensUsed },
      });

      return reply.send({ success: true, data: result });
    } catch (err) {
      await db.collection('sessions').doc(id).update({ status: 'open' });
      return reply.status(500).send({ success: false, error: 'Erro ao analisar sessão' });
    }
  });

  server.delete('/:id', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };

    try {
      const doc = await db.collection('sessions').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Sessão não encontrada' });

      const data = doc.data()!;
      if (data['status'] !== 'open') {
        return reply.status(400).send({ success: false, error: 'Apenas sessões abertas podem ser canceladas' });
      }

      const workspaceDoc = await db.collection('workspaces').doc(data['workspaceId']).get();
      const wData = workspaceDoc.data()!;
      if (user.role !== 'admin' && !wData['memberIds']?.includes(user.uid)) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      await db.collection('sessions').doc(id).update({
        status: 'cancelled',
        closedAt: new Date(),
      });

      await auditService.log({
        workspaceId: data['workspaceId'] as string,
        action: 'session.cancelled',
        actorId: user.uid,
        actorType: 'user',
        metadata: { sessionId: id },
      });

      return reply.send({ success: true, message: 'Sessão cancelada com sucesso' });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao cancelar sessão' });
    }
  });
}
