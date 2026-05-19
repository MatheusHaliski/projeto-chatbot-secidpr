export type Tester2DSlot = 'upper' | 'lower' | 'shoes' | 'accessory';

export type Tester2DSlotBounds = { x: number; y: number; width: number; height: number };

export type Tester2DMannequin = {
  id: 'male' | 'female';
  label: string;
  imageUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  nativeAssetWidth?: number;
  nativeAssetHeight?: number;
  slots: {
    upper: Tester2DSlotBounds;
    lower: Tester2DSlotBounds;
    shoes: Tester2DSlotBounds;
    accessory?: Tester2DSlotBounds;
  };
};

export const TESTER_2D_MANNEQUINS: Tester2DMannequin[] = [
  {
    id: 'male',
    label: 'Male mannequin',
    imageUrl: '/tester2d/mannequins/male-default.png',
    nativeAssetWidth: 232,
    nativeAssetHeight: 649,
    canvasWidth: 1200,
    canvasHeight: 2000,
    slots: {
      upper: { x: 352, y: 454, width: 498, height: 548 },
      lower: { x: 372, y: 968, width: 455, height: 716 },
      shoes: { x: 405, y: 1678, width: 392, height: 190 },
      accessory: { x: 278, y: 340, width: 646, height: 1190 },
    },
  },
  {
    id: 'female',
    label: 'Female mannequin',
    imageUrl: '/tester2d/mannequins/female-default.png',
    nativeAssetWidth: 203,
    nativeAssetHeight: 646,
    canvasWidth: 1200,
    canvasHeight: 2000,
    slots: {
      upper: { x: 360, y: 446, width: 472, height: 538 },
      lower: { x: 380, y: 956, width: 438, height: 728 },
      shoes: { x: 414, y: 1686, width: 376, height: 188 },
      accessory: { x: 288, y: 336, width: 620, height: 1186 },
    },
  },
];

export const getTester2DMannequinById = (id: Tester2DMannequin['id']) =>
  TESTER_2D_MANNEQUINS.find((item) => item.id === id) ?? TESTER_2D_MANNEQUINS[0];
