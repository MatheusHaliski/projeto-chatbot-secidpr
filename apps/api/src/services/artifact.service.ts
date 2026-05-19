// Determines artifact type and builds the artifact object from Claude output
export class ArtifactService {
  buildArtifact(
    type: string,
    filename: string,
    content: string
  ): { type: string; filename: string; content: string } {
    const validTypes = ['txt', 'pdf', 'code', 'spreadsheet', 'other'];
    const normalizedType = validTypes.includes(type) ? type : 'other';

    return {
      type: normalizedType,
      filename: filename || this.defaultFilename(normalizedType),
      content,
    };
  }

  private defaultFilename(type: string): string {
    const map: Record<string, string> = {
      txt: 'decisao.txt',
      pdf: 'relatorio.txt',
      code: 'implementacao.py',
      spreadsheet: 'dados.csv',
      other: 'artefato.txt',
    };
    return map[type] ?? 'artefato.txt';
  }
}
