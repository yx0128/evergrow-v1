import type { ItemDef, TaskTier } from '../types';

const asset = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

export const TASK_REWARDS: Record<TaskTier, number> = {
  quick: 10,
  standard: 25,
  deep: 50,
};

export const TASK_TIER_LABELS: Record<TaskTier, string> = {
  quick: 'Quick',
  standard: 'Standard',
  deep: 'Deep Work',
};

export const BASE_HEIGHT = 0.2333;
export const FOOTPRINT = 0.96;

export const ITEMS: ItemDef[] = [
  {
    id: 'sandstone_tile',
    name: 'Sandstone Tile',
    category: 'base',
    cost: 12,
    modelUrl: asset('sandstone_tile.glb'),
    blurb: 'A warm honeyed slab for your floating courtyard.',
    accent: '#D9BE8F',
    glyph: 'square',
  },
  {
    id: 'slate_tile',
    name: 'Slate Tile',
    category: 'base',
    cost: 16,
    modelUrl: asset('slate_tile.glb'),
    blurb: 'Cool blue-grey stone with a quiet, moonlit mood.',
    accent: '#8A99A8',
    glyph: 'grid',
  },
  {
    id: 'grass_tile',
    name: 'Grass Tile',
    category: 'base',
    cost: 14,
    modelUrl: asset('grass_tile.glb'),
    blurb: 'Soft clipped turf with tiny spring tufts.',
    accent: '#9CB47A',
    glyph: 'sprout',
  },
  {
    id: 'water_basin',
    name: 'Water Basin',
    category: 'base',
    cost: 30,
    modelUrl: asset('water_basin.glb'),
    blurb: 'A sunken stone pool that catches the sky.',
    accent: '#8FC6D8',
    glyph: 'droplets',
  },
  {
    id: 'stone_stairs',
    name: 'Stone Stairs',
    category: 'base',
    cost: 34,
    modelUrl: asset('stone_stairs.glb'),
    blurb: 'Three shallow steps for a miniature promenade.',
    accent: '#B9AE9C',
    glyph: 'stairs',
  },
  {
    id: 'stone_lantern',
    name: 'Stone Lantern',
    category: 'prop',
    cost: 40,
    modelUrl: asset('stone_lantern.glb'),
    blurb: 'A paper-soft glow for late-night tending.',
    accent: '#F0C87A',
    glyph: 'lamp',
    light: 'lantern',
    modelScale: 0.9,
  },
  {
    id: 'birdbath_fountain',
    name: 'Birdbath Fountain',
    category: 'prop',
    cost: 55,
    modelUrl: asset('birdbath_fountain.glb'),
    blurb: 'A shallow basin with a drowsy little spout.',
    accent: '#A8CBD8',
    glyph: 'waves',
    modelScale: 0.9,
  },
  {
    id: 'balustrade',
    name: 'Balustrade',
    category: 'prop',
    cost: 22,
    modelUrl: asset('balustrade.glb'),
    blurb: 'A tidy stone rail to edge a floating terrace.',
    accent: '#D6CCBC',
    glyph: 'columns',
  },
  {
    id: 'firepot',
    name: 'Firepot',
    category: 'prop',
    cost: 48,
    modelUrl: asset('firepot.glb'),
    blurb: 'Copper coals that hum with amber light.',
    accent: '#E58C5B',
    glyph: 'flame',
    light: 'fire',
    modelScale: 0.65,
  },
  {
    id: 'rose_planter',
    name: 'Rose Planter',
    category: 'prop',
    cost: 30,
    modelUrl: asset('rose_planter.glb'),
    blurb: 'A cedar box crowded with blush roses.',
    accent: '#D98A92',
    glyph: 'flower',
    modelScale: 0.65,
  },
  {
    id: 'blossom_tree',
    name: 'Blossom Tree',
    category: 'prop',
    cost: 85,
    modelUrl: asset('blossom_tree.glb'),
    blurb: 'Petal clouds on a crooked, friendly trunk.',
    accent: '#E7B6C4',
    glyph: 'tree',
  },
  {
    id: 'market_stall',
    name: 'Market Stall',
    category: 'prop',
    cost: 110,
    modelUrl: asset('market_stall.glb'),
    blurb: 'A striped canopy and crates of tiny produce.',
    accent: '#D6A05E',
    glyph: 'store',
  },
  {
    id: 'wooden_bench',
    name: 'Wooden Bench',
    category: 'prop',
    cost: 32,
    modelUrl: asset('wooden_bench.glb'),
    blurb: 'A quiet seat for watching petals drift.',
    accent: '#B9855B',
    glyph: 'bench',
    modelScale: 0.85,
  },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);

export const BASE_ITEMS = ITEMS.filter((item) => item.category === 'base');
export const PROP_ITEMS = ITEMS.filter((item) => item.category === 'prop');

export const STARTER_PLACEMENTS = [
  { x: -1, z: -1 },
  { x: 0, z: -1 },
  { x: 1, z: -1 },
  { x: -1, z: 0 },
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: -1, z: 1 },
  { x: 0, z: 1 },
  { x: 1, z: 1 },
];

export const STARTER_TASKS = [
  { title: 'Pour a glass of water', tier: 'quick' as TaskTier },
  { title: 'Tidy one small surface', tier: 'standard' as TaskTier },
  { title: 'Write for 25 focused minutes', tier: 'deep' as TaskTier },
];

export const STARTER_INVENTORY: Record<string, number> = {
  stone_lantern: 1,
  rose_planter: 1,
};

export const STARTER_COINS = 80;
