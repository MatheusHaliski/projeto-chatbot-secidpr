import { PlacementProfile } from '@/app/backend/types/entities';
import { BrandsRepository } from '@/app/backend/repositories/BrandsRepository';

const DEFAULT_PROFILES: PlacementProfile[] = [
  {
    profile_id: 'upper_chest_center',
    piece_type: 'upper_piece',
    anchor: 'chest_center',
    offset: { x: 0, y: 0.1, z: 0.03 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 0.12,
  },
  {
    profile_id: 'lower_thigh_front',
    piece_type: 'lower_piece',
    anchor: 'thigh_front',
    offset: { x: 0.05, y: -0.25, z: 0.02 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 0.1,
  },
  {
    profile_id: 'shoes_side_outer',
    piece_type: 'shoes_piece',
    anchor: 'outer_side',
    offset: { x: 0.08, y: -0.45, z: 0.08 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: 0.09,
  },
  {
    profile_id: 'accessory_front_center',
    piece_type: 'accessory_piece',
    anchor: 'front_center',
    offset: { x: 0, y: 0, z: 0.02 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 0.08,
  },
];

export class BrandPlacementService {
  constructor(private readonly brandsRepository = new BrandsRepository()) {}

  async getPlacementProfile(input: { brandId: string; pieceType: string }): Promise<PlacementProfile> {
    const catalog = await this.brandsRepository.getActiveLogoCatalogByBrandId(input.brandId);
    const desiredPieceType = input.pieceType as PlacementProfile['piece_type'];

    const profileFromCatalog = catalog?.placement_profiles?.find((profile) => profile.piece_type === desiredPieceType);
    if (profileFromCatalog) return profileFromCatalog;

    return DEFAULT_PROFILES.find((profile) => profile.piece_type === desiredPieceType) ?? DEFAULT_PROFILES[0];
  }
}
