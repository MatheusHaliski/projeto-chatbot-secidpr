import { getAdminFirestore } from '@/app/lib/firebaseAdmin';

const BRAND_NAMES = ['Adidas', 'Nike', 'Zara', 'C&A', 'Puma', 'Levis', 'Lacoste'];
const SEASONS = ['winter', 'summer', 'autumn', 'spring'];
const GENDERS = ['male', 'female'];

const SAMPLE_ITEMS: Array<{
  id: string;
  name: string;
  brand: string;
  season: string;
  gender: string;
  piece_type: string;
  color: string;
  material: string;
  image_url: string;
}> = [
  {
    id: 'piece_sample_1',
    name: 'Adidas Winter Hoodie',
    brand: 'Adidas',
    season: 'winter',
    gender: 'male',
    piece_type: 'upper_piece',
    color: 'black',
    material: 'cotton',
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200',
  },
  {
    id: 'piece_sample_2',
    name: 'Nike Summer Sneaker',
    brand: 'Nike',
    season: 'summer',
    gender: 'female',
    piece_type: 'shoes_piece',
    color: 'white',
    material: 'synthetic',
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200',
  },
  {
    id: 'piece_sample_3',
    name: 'Zara Autumn Chino',
    brand: 'Zara',
    season: 'autumn',
    gender: 'male',
    piece_type: 'lower_piece',
    color: 'beige',
    material: 'denim',
    image_url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200',
  },
  {
    id: 'piece_sample_4',
    name: 'C&A Spring Belt',
    brand: 'C&A',
    season: 'spring',
    gender: 'female',
    piece_type: 'accessory_piece',
    color: 'brown',
    material: 'leather',
    image_url: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=1200',
  },
  {
    id: 'piece_sample_5',
    name: 'Puma Street Jacket',
    brand: 'Puma',
    season: 'winter',
    gender: 'female',
    piece_type: 'upper_piece',
    color: 'olive',
    material: 'polyester',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
  },
];

function getBrandDocId(brandName: string): string {
  return `brand_${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

function getMarketDocId(season: string, gender: string): string {
  return `market_${season}_${gender}`;
}

function getBrandLogoUrl(brandName: string): string | null {
  const key = brandName.trim().toLowerCase();
  const brandLogoMap: Record<string, string> = {
    adidas: '/adidas.png',
    nike: '/nike.png',
    zara: '/zara.jpg',
    'c&a': '/cea.jpg',
    puma: '/puma.jpg',
    lacoste: '/lacoste.jpg',
    levis: '/levis.jpg',
  };
  return brandLogoMap[key] ?? null;
}

export async function ensureSaiCatalogSeeded() {
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  const brandWrites = BRAND_NAMES.map((brandName) =>
    db
      .collection('sai-brands')
      .doc(getBrandDocId(brandName))
      .set(
        {
          name: brandName,
          logo_url: getBrandLogoUrl(brandName),
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      ),
  );

  const marketWrites = SEASONS.flatMap((season) =>
    GENDERS.map((gender) =>
      db
        .collection('sai-markets')
        .doc(getMarketDocId(season, gender))
        .set(
          {
            season,
            gender,
            created_at: now,
            updated_at: now,
          },
          { merge: true },
        ),
    ),
  );

  const pieceItemWrites = SAMPLE_ITEMS.map((item) =>
    db
      .collection('sai-pieceItems')
      .doc(item.id)
      .set(
        {
          brand_id: getBrandDocId(item.brand),
          market_id: getMarketDocId(item.season, item.gender),
          name: item.name,
          image_url: item.image_url,
          photo: item.image_url,
          piece_type: item.piece_type,
          color: item.color,
          material: item.material,
          store_url: null,
          price_range: '$$',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      ),
  );


  const logoCatalogWrites = BRAND_NAMES.map((brandName) =>
    db
      .collection('sai-brandLogoCatalog')
      .doc(`catalog_${getBrandDocId(brandName)}`)
      .set(
        {
          brand_id: getBrandDocId(brandName),
          logo_image_url: getBrandLogoUrl(brandName),
          logo_glb_url: null,
          detection_aliases: [brandName.toLowerCase()],
          placement_profiles: [
            { profile_id: 'upper_chest_center', piece_type: 'upper_piece', anchor: 'chest_center', offset: { x: 0, y: 0.1, z: 0.03 }, rotation: { x: 0, y: 0, z: 0 }, scale: 0.12 },
            { profile_id: 'lower_thigh_front', piece_type: 'lower_piece', anchor: 'thigh_front', offset: { x: 0.05, y: -0.25, z: 0.02 }, rotation: { x: 0, y: 0, z: 0 }, scale: 0.1 },
            { profile_id: 'shoes_side_outer', piece_type: 'shoes_piece', anchor: 'outer_side', offset: { x: 0.08, y: -0.45, z: 0.08 }, rotation: { x: 0, y: 90, z: 0 }, scale: 0.09 },
            { profile_id: 'accessory_front_center', piece_type: 'accessory_piece', anchor: 'front_center', offset: { x: 0, y: 0, z: 0.02 }, rotation: { x: 0, y: 0, z: 0 }, scale: 0.08 },
          ],
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      ),
  );

  await Promise.all([...brandWrites, ...logoCatalogWrites, ...marketWrites, ...pieceItemWrites]);
}
