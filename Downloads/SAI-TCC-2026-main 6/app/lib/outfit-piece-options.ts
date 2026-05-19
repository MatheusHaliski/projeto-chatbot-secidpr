export type OutfitSlotKey = 'upper' | 'lower' | 'shoes' | 'accessory';

export type OutfitOption = {
  value: string;
  label: string;
  synonyms: string[];
};

export const OUTFIT_PIECE_OPTIONS: Record<OutfitSlotKey, OutfitOption[]> = {
  upper: [
    { value: 't-shirt', label: 'T-Shirt', synonyms: ['tshirt', 't-shirt', 'tee', 'camiseta', 'camisa basica'] },
    { value: 'shirt', label: 'Shirt', synonyms: ['camisa', 'social shirt', 'button up', 'button-up'] },
    { value: 'polo', label: 'Polo', synonyms: ['polo shirt', 'camisa polo'] },
    { value: 'hoodie', label: 'Hoodie', synonyms: ['moletom', 'hooded sweatshirt'] },
    { value: 'sweater', label: 'Sweater', synonyms: ['sueter', 'pullover', 'tricô', 'tricot'] },
    { value: 'cardigan', label: 'Cardigan', synonyms: ['cardigã', 'cardiga'] },
    { value: 'blazer', label: 'Blazer', synonyms: ['sport coat'] },
    { value: 'jacket', label: 'Jacket', synonyms: ['jaqueta', 'bomber', 'windbreaker'] },
    { value: 'coat', label: 'Coat', synonyms: ['casaco', 'sobretudo'] },
    { value: 'trench-coat', label: 'Trench Coat', synonyms: ['trench', 'gabardine'] },
    { value: 'vest', label: 'Vest', synonyms: ['colete', 'waistcoat'] },
    { value: 'crop-top', label: 'Crop Top', synonyms: ['cropped', 'top cropped'] },
    { value: 'tank-top', label: 'Tank Top', synonyms: ['regata'] },
    { value: 'sweatshirt', label: 'Sweatshirt', synonyms: ['crewneck'] },
  ],
  lower: [
    { value: 'jeans', label: 'Jeans', synonyms: ['calça jeans', 'denim pants'] },
    { value: 'trousers', label: 'Trousers', synonyms: ['calça social', 'pants', 'calça'] },
    { value: 'cargo-pants', label: 'Cargo Pants', synonyms: ['cargo', 'calça cargo'] },
    { value: 'shorts', label: 'Shorts', synonyms: ['short', 'bermuda'] },
    { value: 'skirt', label: 'Skirt', synonyms: ['saia'] },
    { value: 'leggings', label: 'Leggings', synonyms: ['legging'] },
    { value: 'joggers', label: 'Joggers', synonyms: ['calça jogger', 'sweatpants'] },
    { value: 'chinos', label: 'Chinos', synonyms: ['chino'] },
    { value: 'wide-leg-pants', label: 'Wide-leg Pants', synonyms: ['wide leg', 'pantalona'] },
    { value: 'mini-skirt', label: 'Mini Skirt', synonyms: ['minissaia', 'mini saia'] },
    { value: 'midi-skirt', label: 'Midi Skirt', synonyms: ['saia midi'] },
  ],
  shoes: [
    { value: 'sneakers', label: 'Sneakers', synonyms: ['tenis', 'tênis', 'trainer'] },
    { value: 'boots', label: 'Boots', synonyms: ['bota', 'boot'] },
    { value: 'loafers', label: 'Loafers', synonyms: ['mocassim'] },
    { value: 'heels', label: 'Heels', synonyms: ['salto', 'high heels'] },
    { value: 'sandals', label: 'Sandals', synonyms: ['sandalia', 'sandália'] },
    { value: 'flats', label: 'Flats', synonyms: ['sapatilha'] },
    { value: 'dress-shoes', label: 'Dress Shoes', synonyms: ['social shoes', 'sapato social'] },
    { value: 'running-shoes', label: 'Running Shoes', synonyms: ['running', 'tenis corrida', 'tênis corrida'] },
  ],
  accessory: [
    { value: 'bag', label: 'Bag', synonyms: ['bolsa', 'purse'] },
    { value: 'backpack', label: 'Backpack', synonyms: ['mochila'] },
    { value: 'cap', label: 'Cap', synonyms: ['boné', 'bone'] },
    { value: 'hat', label: 'Hat', synonyms: ['chapéu', 'chapeu'] },
    { value: 'belt', label: 'Belt', synonyms: ['cinto'] },
    { value: 'sunglasses', label: 'Sunglasses', synonyms: ['óculos de sol', 'oculos de sol'] },
    { value: 'watch', label: 'Watch', synonyms: ['relogio', 'relógio'] },
    { value: 'necklace', label: 'Necklace', synonyms: ['colar'] },
    { value: 'bracelet', label: 'Bracelet', synonyms: ['pulseira'] },
    { value: 'earrings', label: 'Earrings', synonyms: ['brincos', 'brinco'] },
    { value: 'scarf', label: 'Scarf', synonyms: ['cachecol'] },
  ],
};

export const SLOT_TYPE_ALIASES: Record<OutfitSlotKey, string[]> = {
  upper: ['upper', 'upper piece', 'top', 'tops', 'base_upper', 'outer_layer'],
  lower: ['lower', 'lower piece', 'bottom', 'bottoms'],
  shoes: ['shoes', 'shoes piece', 'shoe', 'footwear'],
  accessory: ['accessory', 'accessories'],
};

export const COLOR_SYNONYMS: Record<string, string> = {
  azul: 'Blue', blue: 'Blue', navy: 'Navy', marinho: 'Navy',
  preto: 'Black', black: 'Black', branco: 'White', white: 'White',
  cinza: 'Gray', grey: 'Gray', gray: 'Gray', bege: 'Beige', beige: 'Beige',
  marrom: 'Brown', castanho: 'Brown', brown: 'Brown',
  vermelho: 'Red', red: 'Red', vinho: 'Burgundy', burgundy: 'Burgundy',
  verde: 'Green', green: 'Green', oliva: 'Olive', olive: 'Olive',
  amarelo: 'Yellow', yellow: 'Yellow', roxo: 'Purple', purple: 'Purple',
  rosa: 'Pink', pink: 'Pink', laranja: 'Orange', orange: 'Orange',
};

export const MATERIAL_SYNONYMS: Record<string, string> = {
  jeans: 'Denim', denim: 'Denim', couro: 'Leather', leather: 'Leather',
  algodao: 'Cotton', algodão: 'Cotton', cotton: 'Cotton',
  linho: 'Linen', linen: 'Linen', seda: 'Silk', silk: 'Silk',
  la: 'Wool', lã: 'Wool', wool: 'Wool', nylon: 'Nylon',
};

export const STYLE_TAG_SYNONYMS: Record<string, string> = {
  casual: 'casual', streetwear: 'streetwear', urbano: 'urban', urban: 'urban',
  formal: 'formal', social: 'formal', minimal: 'minimal', minimalista: 'minimal',
  esportivo: 'sporty', sporty: 'sporty', chic: 'chic',
};

export const OCCASION_TAG_SYNONYMS: Record<string, string> = {
  dia: 'day', day: 'day', noite: 'night', night: 'night',
  trabalho: 'work', work: 'work', festa: 'party', party: 'party',
  daily: 'daily', cotidiano: 'daily', casual: 'casual',
};
