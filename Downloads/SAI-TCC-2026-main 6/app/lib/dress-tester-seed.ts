import { Mannequin2D, WardrobePiece2D } from '@/app/lib/dress-tester-models';

const now = '2026-04-06T00:00:00.000Z';

const mannequinCanvas = { width: 1200, height: 1800 };
const preview = { width: 560, height: 840 };

export const DRESS_TESTER_SEED_MANNEQUINS: Mannequin2D[] = [
  {
    mannequin_id: 'mannequin_editorial_01',
    name: 'Editorial Muse 01',
    gender: 'female',
    body_type: 'balanced',
    pose_code: 'pose_a',
    canvas_width: mannequinCanvas.width,
    canvas_height: mannequinCanvas.height,
    preview_width: preview.width,
    preview_height: preview.height,
    base_image_url: '/dress-tester/muse/base.png',
    shadow_image_url: '/dress-tester/muse/shadow.png',
    hair_back_url: '/dress-tester/muse/hair-back.png',
    hair_front_url: '/dress-tester/muse/hair-front.png',
    face_layer_url: '/dress-tester/muse/face.png',
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    mannequin_id: 'mannequin_street_m_01',
    name: 'Street Fit Male',
    gender: 'male',
    body_type: 'athletic',
    pose_code: 'pose_b',
    canvas_width: mannequinCanvas.width,
    canvas_height: mannequinCanvas.height,
    preview_width: preview.width,
    preview_height: preview.height,
    base_image_url: '/dress-tester/muse/base.png',
    shadow_image_url: '/dress-tester/muse/shadow.png',
    hair_back_url: '/dress-tester/muse/hair-back.png',
    hair_front_url: '/dress-tester/muse/hair-front.png',
    face_layer_url: '/dress-tester/muse/face.png',
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    mannequin_id: 'mannequin_minimal_f_02',
    name: 'Minimal Female',
    gender: 'female',
    body_type: 'slim',
    pose_code: 'pose_c',
    canvas_width: mannequinCanvas.width,
    canvas_height: mannequinCanvas.height,
    preview_width: preview.width,
    preview_height: preview.height,
    base_image_url: '/dress-tester/muse/base.png',
    shadow_image_url: '/dress-tester/muse/shadow.png',
    hair_back_url: '/dress-tester/muse/hair-back.png',
    hair_front_url: '/dress-tester/muse/hair-front.png',
    face_layer_url: '/dress-tester/muse/face.png',
    active: true,
    created_at: now,
    updated_at: now,
  },
];

const makePiece = (
  piece_id: string,
  piece_type: WardrobePiece2D['piece_type'],
  name: string,
  render_layer: number,
  imageUrl: string,
  thumbnailUrl: string,
  extras: Partial<WardrobePiece2D> = {},
): WardrobePiece2D => ({
  piece_id,
  name,
  brand_id: 'brand_1',
  brand: 'SAI Atelier',
  market_id: 'market_1',
  piece_type,
  category_tier: 'premium',
  mannequin_type: 'female_editorial',
  pose_code: 'pose_a',
  render_layer,
  image_url: imageUrl,
  thumbnail_url: thumbnailUrl,
  hide_layers: [],
  hides_piece_types: [],
  conflicts_with: [],
  compatible_piece_types: [],
  anchor: { x: 0, y: 0, scale: 1 },
  wearstyles: ['editorial'],
  colors: ['black'],
  materials: ['cotton'],
  season: 'all',
  gender: 'female',
  compatible_gender: ['female', 'male'],
  render_image_url: null,
  asset_status: 'published',
  active: true,
  created_at: now,
  updated_at: now,
  ...extras,
});

export const DRESS_TESTER_SEED_PIECES: WardrobePiece2D[] = [
  makePiece('top_1', 'top', 'Silk Column Top', 20, '/dress-tester/pieces/top-1.png', '/dress-tester/thumbs/top-1.png'),
  makePiece('top_2', 'top', 'Noir Tucked Tee', 20, '/dress-tester/pieces/top-2.png', '/dress-tester/thumbs/top-2.png'),
  makePiece('top_3', 'top', 'Silver Satin Blouse', 20, '/dress-tester/pieces/top-3.png', '/dress-tester/thumbs/top-3.png'),

  makePiece('bottom_1', 'bottom', 'Tailored Trousers', 25, '/dress-tester/pieces/bottom-1.png', '/dress-tester/thumbs/bottom-1.png'),
  makePiece('bottom_2', 'bottom', 'Pleated Midi Skirt', 25, '/dress-tester/pieces/bottom-2.png', '/dress-tester/thumbs/bottom-2.png'),
  makePiece('bottom_3', 'bottom', 'Leather Pencil Skirt', 25, '/dress-tester/pieces/bottom-3.png', '/dress-tester/thumbs/bottom-3.png'),

  makePiece('dress_1', 'dress', 'Floorline Slip Dress', 24, '/dress-tester/pieces/dress-1.png', '/dress-tester/thumbs/dress-1.png', {
    hides_piece_types: ['top', 'bottom'],
  }),
  makePiece('dress_2', 'dress', 'Structured Evening Dress', 24, '/dress-tester/pieces/dress-2.png', '/dress-tester/thumbs/dress-2.png', {
    hides_piece_types: ['top', 'bottom'],
  }),

  makePiece('shoes_1', 'shoes', 'Pointed Heel', 30, '/dress-tester/pieces/shoes-1.png', '/dress-tester/thumbs/shoes-1.png'),
  makePiece('shoes_2', 'shoes', 'Minimal Sneaker', 30, '/dress-tester/pieces/shoes-2.png', '/dress-tester/thumbs/shoes-2.png'),

  makePiece('bag_1', 'bag', 'Silver Clutch', 35, '/dress-tester/pieces/bag-1.png', '/dress-tester/thumbs/bag-1.png'),
  makePiece('bag_2', 'bag', 'Leather Shoulder Bag', 35, '/dress-tester/pieces/bag-2.png', '/dress-tester/thumbs/bag-2.png'),

  makePiece('outerwear_1', 'outerwear', 'Longline Coat', 40, '/dress-tester/pieces/outerwear-1.png', '/dress-tester/thumbs/outerwear-1.png'),
  makePiece('outerwear_2', 'outerwear', 'Cropped Blazer', 40, '/dress-tester/pieces/outerwear-2.png', '/dress-tester/thumbs/outerwear-2.png'),

  makePiece('accessory_1', 'accessory', 'Pearl Necklace', 50, '/dress-tester/pieces/accessory-1.png', '/dress-tester/thumbs/accessory-1.png'),
  makePiece('accessory_2', 'accessory', 'Sculptural Earrings', 50, '/dress-tester/pieces/accessory-2.png', '/dress-tester/thumbs/accessory-2.png'),
];
