export type ItemCategory = 'base' | 'prop';
export type TaskTier = 'quick' | 'standard' | 'deep';
export type ThemeMode = 'day' | 'night';
export type Rotation = 0 | 1 | 2 | 3;

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  cost: number;
  modelUrl: string;
  blurb: string;
  accent: string;
  glyph: string;
  light?: 'lantern' | 'fire';
}

export interface Task {
  id: string;
  title: string;
  tier: TaskTier;
  done: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface PlacedItem {
  id: string;
  itemId: string;
  x: number;
  z: number;
  rotation: Rotation;
  placedAt: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  reward?: number;
}

export interface PersistedWorld {
  coins: number;
  tasks: Task[];
  inventory: Record<string, number>;
  placedItems: PlacedItem[];
  themeMode: ThemeMode;
}
