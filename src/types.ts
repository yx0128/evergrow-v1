export type ItemCategory = 'base' | 'prop';
export type HotbarGroup = 'terrain' | 'nature' | 'decor' | 'buildings';
export type HotbarView = 'all' | HotbarGroup;
export type TaskTier = 'quick' | 'standard' | 'deep';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ThemeMode = 'day' | 'night';
export type GraphicsQuality = 'high' | 'low';
export type TaskLayout = 'bar' | 'tab';
export type Rotation = 0 | 1 | 2 | 3;

export interface ItemDef {
  id: string;
  name: string;
  shortName: string;
  category: ItemCategory;
  hotbarGroup: HotbarGroup;
  cost: number;
  modelUrl: string;
  blurb: string;
  accent: string;
  glyph: string;
  light?: 'lantern' | 'fire';
  procedural?: boolean;
  modelScale?: number;
  modelHeightScale?: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  tier: TaskTier;
  priority: TaskPriority;
  done: boolean;
  createdAt: number;
  completedAt?: number;
  dueDate?: string;
  pinned?: boolean;
  subtasks: Subtask[];
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
  graphicsQuality: GraphicsQuality;
  taskLayout: TaskLayout;
}
