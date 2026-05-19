import { SchemesService } from '@/app/backend/services/SchemesService';
import { CreateSchemeInput } from '@/app/backend/types/entities';

export class SchemesController {
  constructor(private readonly schemesService = new SchemesService()) {}

  async create(body: CreateSchemeInput) {
    if (body.creation_mode === 'ai') {
      return this.schemesService.createAiScheme(body);
    }

    return this.schemesService.createManualScheme(body);
  }

  async listPublic() {
    return this.schemesService.listPublicSchemes();
  }

  async listByUser(userId: string) {
    return this.schemesService.listSchemesByUser(userId);
  }

  async getById(schemeId: string) {
    return this.schemesService.getSchemeDetails(schemeId);
  }
}
