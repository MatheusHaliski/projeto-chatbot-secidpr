// Orchestrates the full analysis flow: Claude → Firestore update
import { getAdminFirestore } from '../config/firebase';
import { ClaudeService } from './claude.service';
import { ArtifactService } from './artifact.service';

interface AnalysisResult {
  decision: {
    summary: string;
    recommendation: string;
    justification: string;
    pendingPoints: string[];
    consensusLevel: string;
    generatedAt: Date;
    tokensUsed: number;
  };
  artifact: {
    type: string;
    filename: string;
    content: string;
    generatedAt: Date;
  };
}

export class DecisionService {
  private claudeService = new ClaudeService();
  private artifactService = new ArtifactService();

  async analyze(sessionId: string, topic: string, opinions: string[]): Promise<AnalysisResult> {
    const db = getAdminFirestore();

    const claudeResult = await this.claudeService.analyzeOpinions(topic, opinions);

    const artifact = this.artifactService.buildArtifact(
      claudeResult.artifactType,
      claudeResult.artifactFilename,
      claudeResult.artifactContent
    );

    const now = new Date();
    const decision = {
      summary: claudeResult.summary,
      recommendation: claudeResult.recommendation,
      justification: claudeResult.justification,
      pendingPoints: claudeResult.pendingPoints,
      consensusLevel: claudeResult.consensusLevel,
      generatedAt: now,
      tokensUsed: claudeResult.tokensUsed,
    };

    await db.collection('sessions').doc(sessionId).update({
      status: 'closed',
      closedAt: now,
      decision,
      artifact: { ...artifact, generatedAt: now },
    });

    return { decision, artifact: { ...artifact, generatedAt: now } };
  }
}
