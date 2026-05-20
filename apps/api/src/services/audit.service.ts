// Records audit events to Firestore audit_logs collection
import { getAdminFirestore } from '../config/firebase';

interface AuditEntry {
  workspaceId: string;
  action: string;
  actorId: string;
  actorType: 'user' | 'bot' | 'system';
  metadata: Record<string, unknown>;
}

export class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    const db = getAdminFirestore();
    try {
      await db.collection('audit_logs').add({
        ...entry,
        timestamp: new Date(),
      });
    } catch {
      // Audit failures must never break the main flow
    }
  }
}
