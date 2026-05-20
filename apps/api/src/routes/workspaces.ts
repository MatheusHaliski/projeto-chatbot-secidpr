import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { getAdminFirestore } from '../config/firebase';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';

const COLLECTION = 'workspaces';

const createSchema = z.object({
  name: z.string().min(2).max(100),
  telegramChatId: z.string().min(1),
  settings: z.object({
    maxOpinionsPerSession: z.number().int().min(2).max(50).default(20),
    language: z.enum(['pt-BR', 'en']).default('pt-BR'),
    notifyOnDecision: z.boolean().default(true),
    allowedUserIds: z.array(z.string()).default([]),
    systemPrompt: z.string().optional(),
  }).optional(),
});

const updateSchema = createSchema.partial();

export default async function workspaceRoutes(server: FastifyInstance): Promise<void> {
  server.addHook('preHandler', requireAuth(server));

  const db = getAdminFirestore();
  const tokenService = new TokenService();
  const auditService = new AuditService();

  server.get('/', async (request, reply) => {
    const user = request.user as { uid: string; workspaceIds: string[]; role: string };
    try {
      if (user.role === 'admin') {
        const snap = await db.collection(COLLECTION).get();
        return reply.send({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
      }
      if (!user.workspaceIds?.length) return reply.send({ success: true, data: [] });

      const snap = await db.collection(COLLECTION)
        .where('memberIds', 'array-contains', user.uid)
        .get();
      return reply.send({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar workspaces' });
    }
  });

  server.post('/', async (request, reply) => {
    const user = request.user as { uid: string };
    const body = createSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: body.error.flatten() });
    }

    try {
      const { plainToken, tokenHash } = await tokenService.generateToken();
      const now = new Date();
      const data = {
        ...body.data,
        ownerId: user.uid,
        memberIds: [user.uid],
        apiTokenHash: tokenHash,
        plan: 'free',
        createdAt: now,
        updatedAt: now,
        settings: {
          maxOpinionsPerSession: 20,
          language: 'pt-BR',
          notifyOnDecision: true,
          allowedUserIds: [],
          ...body.data.settings,
        },
      };

      const ref = await db.collection(COLLECTION).add(data);
      await auditService.log({
        workspaceId: ref.id,
        action: 'workspace.created',
        actorId: user.uid,
        actorType: 'user',
        metadata: { name: body.data.name },
      });

      return reply.status(201).send({ success: true, data: { id: ref.id, token: plainToken, ...data } });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao criar workspace' });
    }
  });

  server.get('/:id', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };

    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Workspace não encontrado' });

      const data = doc.data()!;
      if (user.role !== 'admin' && !data['memberIds']?.includes(user.uid)) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      return reply.send({ success: true, data: { id: doc.id, ...data } });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar workspace' });
    }
  });

  server.patch('/:id', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };
    const body = updateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ success: false, error: body.error.flatten() });

    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Workspace não encontrado' });

      const data = doc.data()!;
      if (user.role !== 'admin' && data['ownerId'] !== user.uid) {
        return reply.status(403).send({ success: false, error: 'Apenas o proprietário pode editar' });
      }

      const updates = { ...body.data, updatedAt: new Date() };
      await db.collection(COLLECTION).doc(id).update(updates);
      await auditService.log({
        workspaceId: id, action: 'workspace.updated',
        actorId: user.uid, actorType: 'user',
        metadata: { updatedFields: Object.keys(body.data) },
      });

      return reply.send({ success: true, data: { id, ...updates } });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar workspace' });
    }
  });

  server.post('/:id/token', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };

    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Workspace não encontrado' });

      const data = doc.data()!;
      if (user.role !== 'admin' && data['ownerId'] !== user.uid) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      const { plainToken, tokenHash } = await tokenService.generateToken();
      await db.collection(COLLECTION).doc(id).update({ apiTokenHash: tokenHash, updatedAt: new Date() });

      await auditService.log({
        workspaceId: id, action: 'token.regenerated',
        actorId: user.uid, actorType: 'user', metadata: {},
      });

      return reply.send({ success: true, data: { token: plainToken, createdAt: new Date().toISOString() } });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao regenerar token' });
    }
  });

  server.delete('/:id/token', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };

    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) return reply.status(404).send({ success: false, error: 'Workspace não encontrado' });

      const data = doc.data()!;
      if (user.role !== 'admin' && data['ownerId'] !== user.uid) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      await db.collection(COLLECTION).doc(id).update({ apiTokenHash: '', updatedAt: new Date() });
      await auditService.log({
        workspaceId: id, action: 'token.revoked',
        actorId: user.uid, actorType: 'user', metadata: {},
      });

      return reply.send({ success: true, message: 'Token revogado com sucesso' });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao revogar token' });
    }
  });

  server.get('/:id/sessions', async (request, reply) => {
    const user = request.user as { uid: string; role: string };
    const { id } = request.params as { id: string };
    const query = request.query as { page?: string; pageSize?: string; status?: string };

    const page = parseInt(query.page ?? '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize ?? '10', 10), 50);

    try {
      const workspaceDoc = await db.collection(COLLECTION).doc(id).get();
      if (!workspaceDoc.exists) return reply.status(404).send({ success: false, error: 'Workspace não encontrado' });

      const wData = workspaceDoc.data()!;
      if (user.role !== 'admin' && !wData['memberIds']?.includes(user.uid)) {
        return reply.status(403).send({ success: false, error: 'Acesso negado' });
      }

      let q = db.collection('sessions').where('workspaceId', '==', id).orderBy('openedAt', 'desc');
      if (query.status) q = q.where('status', '==', query.status) as typeof q;

      const countSnap = await q.count().get();
      const total = countSnap.data().count;

      const snap = await q.offset((page - 1) * pageSize).limit(pageSize).get();
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return reply.send({
        success: true,
        data: { items, total, page, pageSize, hasMore: total > page * pageSize },
      });
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar sessões' });
    }
  });
}
