// Webhook endpoint called by the Python Telegram bot for all bot operations
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireToken } from '../middleware/requireToken';
import { getAdminFirestore } from '../config/firebase';
import { DecisionService } from '../services/decision.service';
import { AuditService } from '../services/audit.service';

const payloadSchema = z.object({
  action: z.enum(['open_session', 'add_opinion', 'analyze', 'cancel_session', 'get_status']),
  chatId: z.string(),
  topic: z.string().optional(),
  openedBy: z.string().optional(),
  author: z.string().optional(),
  authorId: z.string().optional(),
  content: z.string().optional(),
  sessionId: z.string().optional(),
});

export default async function botWebhookRoutes(server: FastifyInstance): Promise<void> {
  server.get('/health', async () => ({ status: 'ok' }));

  server.post('/', { preHandler: requireToken(server) }, async (request, reply) => {
    const body = payloadSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Payload inválido' });
    }

    const workspace = (request as typeof request & { workspace: { id: string; settings: { maxOpinionsPerSession: number } } }).workspace;
    const db = getAdminFirestore();
    const decisionService = new DecisionService();
    const auditService = new AuditService();
    const { action, chatId } = body.data;

    try {
      switch (action) {
        case 'open_session': {
          if (!body.data.topic || !body.data.openedBy) {
            return reply.status(400).send({ success: false, error: 'topic e openedBy são obrigatórios' });
          }

          const existing = await db.collection('sessions')
            .where('workspaceId', '==', workspace.id)
            .where('telegramChatId', '==', chatId)
            .where('status', '==', 'open')
            .limit(1).get();

          if (!existing.empty) {
            return reply.status(409).send({ success: false, error: 'Já existe uma sessão aberta neste grupo' });
          }

          const sessionData = {
            workspaceId: workspace.id,
            telegramChatId: chatId,
            topic: body.data.topic,
            status: 'open',
            openedBy: body.data.openedBy,
            openedAt: new Date(),
            opinionCount: 0,
          };

          const ref = await db.collection('sessions').add(sessionData);
          await auditService.log({
            workspaceId: workspace.id, action: 'session.opened',
            actorId: body.data.openedBy, actorType: 'bot',
            metadata: { sessionId: ref.id, topic: body.data.topic },
          });

          return reply.status(201).send({ success: true, data: { id: ref.id, ...sessionData } });
        }

        case 'add_opinion': {
          if (!body.data.sessionId || !body.data.author || !body.data.authorId || !body.data.content) {
            return reply.status(400).send({ success: false, error: 'Campos obrigatórios ausentes' });
          }

          const sessionRef = db.collection('sessions').doc(body.data.sessionId);
          const max = workspace.settings.maxOpinionsPerSession;
          const opinionData = {
            author: body.data.author,
            authorId: body.data.authorId,
            content: body.data.content,
            timestamp: new Date(),
          };
          const opinionRef = sessionRef.collection('opinions').doc();

          const currentCount = await db.runTransaction(async (tx) => {
            const sessionDoc = await tx.get(sessionRef);
            if (!sessionDoc.exists || sessionDoc.data()!['status'] !== 'open') {
              throw new Error('SESSION_NOT_OPEN');
            }

            if (sessionDoc.data()!['workspaceId'] !== workspace.id || sessionDoc.data()!['telegramChatId'] !== chatId) {
              throw new Error('SESSION_FORBIDDEN');
            }

            const count = sessionDoc.data()!['opinionCount'] as number;
            if (count >= max) {
              throw new Error('OPINION_LIMIT_REACHED');
            }

            tx.set(opinionRef, opinionData);
            tx.update(sessionRef, { opinionCount: count + 1 });
            return count + 1;
          });

          return reply.send({ success: true, data: { id: opinionRef.id, ...opinionData, currentCount, max } });
        }

        case 'analyze': {
          if (!body.data.sessionId) {
            return reply.status(400).send({ success: false, error: 'sessionId é obrigatório' });
          }

          const sessionDoc = await db.collection('sessions').doc(body.data.sessionId).get();
          if (!sessionDoc.exists || sessionDoc.data()!['status'] !== 'open') {
            return reply.status(400).send({ success: false, error: 'Sessão não está disponível para análise' });
          }
          if (sessionDoc.data()!['workspaceId'] !== workspace.id || sessionDoc.data()!['telegramChatId'] !== chatId) {
            return reply.status(403).send({ success: false, error: 'Sessão não pertence ao workspace/token informado' });
          }

          const opinionsSnap = await db.collection('sessions').doc(body.data.sessionId)
            .collection('opinions').get();

          if (opinionsSnap.size < 2) {
            return reply.status(400).send({ success: false, error: 'Mínimo de 2 opiniões necessário para análise' });
          }

          await db.collection('sessions').doc(body.data.sessionId).update({ status: 'analyzing' });

          const opinions = opinionsSnap.docs.map((d) => d.data()['content'] as string);
          const result = await decisionService.analyze(
            body.data.sessionId,
            sessionDoc.data()!['topic'] as string,
            opinions
          );

          await auditService.log({
            workspaceId: workspace.id, action: 'session.analyzed',
            actorId: 'bot', actorType: 'bot',
            metadata: { sessionId: body.data.sessionId, tokensUsed: result.decision.tokensUsed },
          });

          return reply.send({ success: true, data: result });
        }

        case 'cancel_session': {
          if (!body.data.sessionId) {
            return reply.status(400).send({ success: false, error: 'sessionId é obrigatório' });
          }

          const sessionDoc = await db.collection('sessions').doc(body.data.sessionId).get();
          if (!sessionDoc.exists) {
            return reply.status(404).send({ success: false, error: 'Sessão não encontrada' });
          }
          if (sessionDoc.data()!['workspaceId'] !== workspace.id || sessionDoc.data()!['telegramChatId'] !== chatId) {
            return reply.status(403).send({ success: false, error: 'Sessão não pertence ao workspace/token informado' });
          }

          await db.collection('sessions').doc(body.data.sessionId).update({
            status: 'cancelled', closedAt: new Date(),
          });

          return reply.send({ success: true, message: 'Sessão cancelada' });
        }

        case 'get_status': {
          const snap = await db.collection('sessions')
            .where('workspaceId', '==', workspace.id)
            .where('telegramChatId', '==', chatId)
            .where('status', '==', 'open')
            .limit(1).get();

          if (snap.empty) {
            return reply.send({ success: true, data: null });
          }

          const doc = snap.docs[0]!;
          const opinionsSnap = await db.collection('sessions').doc(doc.id).collection('opinions').get();
          const uniqueAuthors = new Set(opinionsSnap.docs.map((d) => d.data()['author'] as string));

          return reply.send({
            success: true,
            data: {
              id: doc.id,
              ...doc.data(),
              opinionCount: opinionsSnap.size,
              uniqueParticipants: uniqueAuthors.size,
              participantList: Array.from(uniqueAuthors),
              max: workspace.settings.maxOpinionsPerSession,
            },
          });
        }

        default:
          return reply.status(400).send({ success: false, error: 'Ação desconhecida' });
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'OPINION_LIMIT_REACHED') {
        return reply.status(429).send({ success: false, error: 'Limite de opiniões atingido' });
      }
      if (err instanceof Error && err.message === 'SESSION_NOT_OPEN') {
        return reply.status(400).send({ success: false, error: 'Sessão não está aberta' });
      }
      if (err instanceof Error && err.message === 'SESSION_FORBIDDEN') {
        return reply.status(403).send({ success: false, error: 'Sessão não pertence ao workspace/token informado' });
      }
      server.log.error(err);
      return reply.status(500).send({ success: false, error: 'Erro interno ao processar requisição do bot' });
    }
  });
}
