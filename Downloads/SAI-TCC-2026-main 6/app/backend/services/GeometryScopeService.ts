import { ServiceError } from './errors';

interface GeometryScopeInput {
  modelUrl: string;
  pieceType: string;
}

interface GeometryScopeResult {
  passed: boolean;
  scopeScore: number;
  reasons: string[];
}

const HUMAN_RIG_MARKERS = ['mixamorig', 'armature', 'hips', 'spine', 'head', 'upperarm', 'thigh'];

const MAX_BYTES_BY_TYPE: Record<string, number> = {
  upper_piece: 18_000_000,
  lower_piece: 18_000_000,
  shoes_piece: 12_000_000,
  accessory_piece: 10_000_000,
};

export class GeometryScopeService {
  async validate(input: GeometryScopeInput): Promise<GeometryScopeResult> {
    const url = input.modelUrl.trim();
    if (!url) throw new ServiceError('Model URL is required for geometry scope validation.', 400);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceError('Unable to fetch generated model for geometry validation.', 502);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const maxBytes = MAX_BYTES_BY_TYPE[input.pieceType] ?? 18_000_000;
    const reasons: string[] = [];
    let scopeScore = 1;

    if (bytes.byteLength > maxBytes) {
      reasons.push(`Model size ${bytes.byteLength} exceeds limit ${maxBytes} for ${input.pieceType}.`);
      scopeScore -= 0.35;
    }

    const scanWindow = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 700_000))).toLowerCase();
    const markerHits = HUMAN_RIG_MARKERS.filter((marker) => scanWindow.includes(marker));
    if (markerHits.length) {
      reasons.push(`Detected humanoid rig markers: ${markerHits.join(', ')}.`);
      scopeScore -= 0.5;
    }

    const passed = scopeScore >= 0.65;
    if (passed) reasons.push('Garment-only scope heuristics passed.');

    return {
      passed,
      scopeScore: Number(scopeScore.toFixed(3)),
      reasons,
    };
  }
}
