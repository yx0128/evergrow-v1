import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  ITEM_MAP,
  STARTER_COINS,
  STARTER_INVENTORY,
  STARTER_PLACEMENTS,
  STARTER_TASKS,
  TASK_REWARDS,
} from '../data/items';
import { createId } from '../lib/id';
import { cellKey, findBase, findProp, isBasePiece, worldToCell } from '../lib/grid';
import type {
  ActionResult,
  ItemDef,
  PersistedWorld,
  PlacedItem,
  Rotation,
  Task,
  GraphicsQuality,
  TaskTier,
  ThemeMode,
} from '../types';

const STORAGE_KEY = 'moss-and-ember-v1';
const MAX_TASKS = 200;
const MAX_PLACED = 4000;
const MAX_COINS = 9_999_999;
const MAX_STOCK = 999;

export interface WorldState extends PersistedWorld {
  selectedItemId: string | null;
  selectedPieceId: string | null;
  movingItemId: string | null;
  movingRotation: Rotation;
  rotation: Rotation;
  storeMode: boolean;
  hydrated: boolean;
  addTask: (title: string, tier: TaskTier) => ActionResult;
  toggleTask: (id: string) => ActionResult;
  deleteTask: (id: string) => void;
  buyItem: (itemId: string) => ActionResult;
  selectItem: (itemId: string | null) => void;
  selectPiece: (placedId: string | null) => void;
  rotate: () => void;
  toggleTheme: () => void;
  toggleStoreMode: () => void;
  toggleGraphicsQuality: () => void;
  placeAt: (x: number, z: number) => ActionResult;
  beginMove: (placedId: string) => ActionResult;
  moveTo: (x: number, z: number) => ActionResult;
  cancelMove: () => void;
  removeItem: (placedId: string) => ActionResult;
  removeAtCell: (x: number, z: number) => ActionResult;
  resetWorld: () => void;
}

export function createDefaultData(): PersistedWorld {
  const placedAt = Date.now() - 4000;
  return {
    coins: STARTER_COINS,
    tasks: STARTER_TASKS.map((task, index) => ({
      id: `starter-${index + 1}`,
      title: task.title,
      tier: task.tier,
      done: false,
      createdAt: placedAt + index,
    })),
    inventory: { ...STARTER_INVENTORY },
    placedItems: STARTER_PLACEMENTS.map((cell, index) => ({
      id: `starter_tile_${index + 1}`,
      itemId: 'sandstone_tile',
      x: cell.x,
      z: cell.z,
      rotation: 0 as Rotation,
      placedAt,
    })),
    themeMode: 'day',
    graphicsQuality: 'high',
  };
}

function defaultTransient() {
  return {
    selectedItemId: null as string | null,
    selectedPieceId: null as string | null,
    movingItemId: null as string | null,
    movingRotation: 0 as Rotation,
    rotation: 0 as Rotation,
    storeMode: false,
    hydrated: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validTier(value: unknown): value is TaskTier {
  return value === 'quick' || value === 'standard' || value === 'deep';
}

function sanitizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const raw of value.slice(0, MAX_TASKS)) {
    if (!isRecord(raw)) continue;
    const title = cleanString(raw.title, 160);
    if (!title || !validTier(raw.tier)) continue;
    let id = cleanString(raw.id, 80) ?? createId('task');
    if (seen.has(id)) id = createId('task');
    seen.add(id);
    const createdAt =
      typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now();
    const task: Task = {
      id,
      title,
      tier: raw.tier,
      done: raw.done === true,
      createdAt,
    };
    if (task.done && typeof raw.completedAt === 'number') {
      task.completedAt = raw.completedAt;
    }
    tasks.push(task);
  }
  return tasks;
}

function sanitizeInventory(value: unknown): Record<string, number> {
  const inventory: Record<string, number> = {};
  if (!isRecord(value)) return inventory;
  for (const [itemId, count] of Object.entries(value)) {
    if (!ITEM_MAP[itemId]) continue;
    const amount = clampInt(count, 0, MAX_STOCK, 0);
    if (amount > 0) inventory[itemId] = amount;
  }
  return inventory;
}

function sanitizePlaced(value: unknown): PlacedItem[] {
  if (!Array.isArray(value)) return [];
  const baseCells = new Set<string>();
  const propCells = new Set<string>();
  const seenIds = new Set<string>();
  const bases: PlacedItem[] = [];
  const props: PlacedItem[] = [];

  for (const raw of value.slice(0, MAX_PLACED)) {
    if (!isRecord(raw)) continue;
    const itemId = typeof raw.itemId === 'string' ? raw.itemId : '';
    const item = ITEM_MAP[itemId];
    if (!item) continue;
    if (typeof raw.x !== 'number' || typeof raw.z !== 'number') continue;
    if (!Number.isInteger(raw.x) || !Number.isInteger(raw.z)) continue;
    if (Math.abs(raw.x) > 250 || Math.abs(raw.z) > 250) continue;
    const rotation = clampInt(raw.rotation, 0, 3, 0) as Rotation;
    let id = cleanString(raw.id, 100) ?? createId('piece');
    if (seenIds.has(id)) id = createId('piece');
    seenIds.add(id);
    const placedAt =
      typeof raw.placedAt === 'number' && Number.isFinite(raw.placedAt)
        ? raw.placedAt
        : Date.now();
    const piece: PlacedItem = { id, itemId, x: raw.x, z: raw.z, rotation, placedAt };
    const key = cellKey(raw.x, raw.z);
    if (item.category === 'base') {
      if (baseCells.has(key)) continue;
      baseCells.add(key);
      bases.push(piece);
    } else {
      props.push(piece);
    }
  }

  const cleanProps: PlacedItem[] = [];
  for (const piece of props) {
    const key = cellKey(piece.x, piece.z);
    if (!baseCells.has(key) || propCells.has(key)) continue;
    propCells.add(key);
    cleanProps.push(piece);
  }
  return [...bases, ...cleanProps];
}

export function sanitizePersisted(value: unknown): PersistedWorld {
  const defaults = createDefaultData();
  if (!isRecord(value)) return defaults;
  const tasks = sanitizeTasks(value.tasks);
  const inventory = sanitizeInventory(value.inventory);
  const placedItems = sanitizePlaced(value.placedItems);
  return {
    coins: clampInt(value.coins, 0, MAX_COINS, STARTER_COINS),
    tasks: tasks.length > 0 || Array.isArray(value.tasks) ? tasks : defaults.tasks,
    inventory,
    placedItems,
    themeMode: value.themeMode === 'night' ? 'night' : 'day',
    graphicsQuality: value.graphicsQuality === 'low' ? 'low' : 'high',
  };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

function safeStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const probe = '__gg_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return memoryStorage();
    }
  }
  return memoryStorage();
}

function spendCoins(state: WorldState, cost: number): boolean {
  return state.coins >= cost;
}

function itemFor(itemId: string): ItemDef | undefined {
  return ITEM_MAP[itemId];
}

function failure(message: string): ActionResult {
  return { ok: false, message };
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      ...createDefaultData(),
      ...defaultTransient(),

      addTask: (title, tier) => {
        const clean = title.trim().replace(/\s+/g, ' ');
        if (!clean) return failure('Give the task a short name first.');
        if (clean.length > 120) return failure('Keep task names under 120 characters.');
        if (get().tasks.length >= MAX_TASKS) return failure('Task list is full.');
        const task: Task = {
          id: createId('task'),
          title: clean,
          tier,
          done: false,
          createdAt: Date.now(),
        };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return { ok: true, message: `Added “${clean}”.` };
      },

      toggleTask: (id) => {
        const task = get().tasks.find((entry) => entry.id === id);
        if (!task) return failure('That task no longer exists.');
        if (task.done) return failure('This task is already complete.');
        const reward = TASK_REWARDS[task.tier];
        set((state) => ({
          coins: Math.min(MAX_COINS, state.coins + reward),
          tasks: state.tasks.map((entry) =>
            entry.id === id
              ? { ...entry, done: true, completedAt: Date.now() }
              : entry,
          ),
        }));
        return { ok: true, message: `Task complete · +${reward} coins`, reward };
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },

      buyItem: (itemId) => {
        const item = itemFor(itemId);
        if (!item) return failure('Unknown item.');
        if (!spendCoins(get(), item.cost)) {
          return failure(`Need ${item.cost - get().coins} more coins.`);
        }
        set((state) => ({
          coins: state.coins - item.cost,
          inventory: {
            ...state.inventory,
            [itemId]: Math.min(MAX_STOCK, (state.inventory[itemId] ?? 0) + 1),
          },
        }));
        return { ok: true, message: `Bought ${item.name}.` };
      },

      selectItem: (itemId) => {
        if (itemId === null) {
          set({
            selectedItemId: null,
            selectedPieceId: null,
            storeMode: false,
            movingItemId: null,
            movingRotation: 0,
          });
          return;
        }
        const item = itemFor(itemId);
        if (!item) return;
        if ((get().inventory[itemId] ?? 0) <= 0) return;
        set((state) => ({
          selectedItemId: state.selectedItemId === itemId ? null : itemId,
          selectedPieceId: null,
          storeMode: false,
          movingItemId: null,
          movingRotation: 0,
        }));
      },

      selectPiece: (placedId) => {
        if (placedId === null) {
          set({ selectedPieceId: null });
          return;
        }
        const piece = get().placedItems.find((entry) => entry.id === placedId);
        if (!piece) {
          set({ selectedPieceId: null });
          return;
        }
        set((state) => ({
          selectedPieceId: state.selectedPieceId === placedId ? null : placedId,
          selectedItemId: null,
          storeMode: false,
          movingItemId: null,
          movingRotation: 0,
        }));
      },

      toggleGraphicsQuality: () => {
        set((state) => ({
          graphicsQuality: (state.graphicsQuality === 'high'
            ? 'low'
            : 'high') as GraphicsQuality,
        }));
      },

      rotate: () => {
        const state = get();
        if (state.selectedPieceId) {
          const piece = state.placedItems.find(
            (entry) => entry.id === state.selectedPieceId,
          );
          if (!piece) {
            set({ selectedPieceId: null });
            return;
          }
          const attached = isBasePiece(piece)
            ? findProp(state.placedItems, piece.x, piece.z)
            : undefined;
          const rotatedAt = Date.now();
          set({
            placedItems: state.placedItems.map((entry) => {
              if (entry.id === piece.id || entry.id === attached?.id) {
                return {
                  ...entry,
                  rotation: ((entry.rotation + 1) % 4) as Rotation,
                  placedAt: rotatedAt,
                };
              }
              return entry;
            }),
          });
          return;
        }
        if (state.movingItemId) {
          set({
            movingRotation: ((state.movingRotation + 1) % 4) as Rotation,
          });
          return;
        }
        set({ rotation: ((state.rotation + 1) % 4) as Rotation });
      },

      toggleTheme: () => {
        set((state) => ({
          themeMode: (state.themeMode === 'day' ? 'night' : 'day') as ThemeMode,
        }));
      },

      toggleStoreMode: () => {
        set((state) => ({
          storeMode: !state.storeMode,
          selectedItemId: state.storeMode ? state.selectedItemId : null,
          selectedPieceId: null,
          movingItemId: null,
          movingRotation: 0,
        }));
      },

      placeAt: (rawX, rawZ) => {
        const state = get();
        const selected = state.selectedItemId;
        if (!selected) return failure('Pick an item from the hotbar first.');
        const item = itemFor(selected);
        if (!item) return failure('Unknown item.');
        if ((state.inventory[selected] ?? 0) <= 0) {
          return failure('None left in your inventory.');
        }
        const { x, z } = worldToCell(rawX, rawZ);
        const key = cellKey(x, z);
        const base = findBase(state.placedItems, x, z);
        const prop = findProp(state.placedItems, x, z);

        if (item.category === 'base') {
          if (base) return failure('That tile is already occupied.');
        } else {
          if (!base) return failure('Surface props need a base tile beneath them.');
          if (prop) return failure('Something is already sitting there.');
        }

        const remaining = (state.inventory[selected] ?? 0) - 1;
        const placed: PlacedItem = {
          id: createId('piece'),
          itemId: selected,
          x,
          z,
          rotation: state.rotation,
          placedAt: Date.now(),
        };
        set({
          placedItems: [...state.placedItems, placed],
          inventory: { ...state.inventory, [selected]: remaining },
          selectedItemId: remaining > 0 ? selected : null,
          selectedPieceId: null,
          movingItemId: null,
          movingRotation: 0,
        });
        return { ok: true, message: `Placed ${item.name} at ${key}.` };
      },

      beginMove: (placedId) => {
        const state = get();
        const piece = state.placedItems.find((entry) => entry.id === placedId);
        if (!piece) return failure('That piece is already gone.');
        const item = itemFor(piece.itemId);
        if (!item) return failure('Unknown item.');
        set({
          movingItemId: placedId,
          movingRotation: piece.rotation,
          selectedItemId: null,
          selectedPieceId: null,
          storeMode: false,
        });
        return {
          ok: true,
          message: `Moving ${item.name}. Click a valid cell to drop it, or press Esc.`,
        };
      },

      moveTo: (rawX, rawZ) => {
        const state = get();
        const movingId = state.movingItemId;
        if (!movingId) return failure('Pick up a placed piece first.');
        const piece = state.placedItems.find((entry) => entry.id === movingId);
        if (!piece) {
          set({ movingItemId: null });
          return failure('That piece is no longer on the board.');
        }
        const item = itemFor(piece.itemId);
        if (!item) return failure('Unknown item.');
        const { x, z } = worldToCell(rawX, rawZ);
        const movingBase = isBasePiece(piece);
        const attachedProp = movingBase
          ? findProp(state.placedItems, piece.x, piece.z)
          : undefined;
        const rotationDelta =
          (state.movingRotation - piece.rotation + 4) % 4;
        if (x === piece.x && z === piece.z) {
          if (rotationDelta !== 0) {
            set({
              placedItems: state.placedItems.map((entry) => {
                if (entry.id === piece.id) {
                  return {
                    ...entry,
                    rotation: state.movingRotation,
                    placedAt: Date.now(),
                  };
                }
                if (attachedProp && entry.id === attachedProp.id) {
                  return {
                    ...entry,
                    rotation: ((entry.rotation + rotationDelta) % 4) as Rotation,
                    placedAt: Date.now(),
                  };
                }
                return entry;
              }),
              movingItemId: null,
              movingRotation: 0,
              selectedPieceId: null,
            });
            return { ok: true, message: `Rotated ${item.name}.` };
          }
          set({ movingItemId: null, movingRotation: 0, selectedPieceId: null });
          return { ok: true, message: `${item.name} stays put.` };
        }
        const others = state.placedItems.filter(
          (entry) => entry.id !== piece.id && entry.id !== attachedProp?.id,
        );
        const destinationBase = findBase(others, x, z);
        const destinationProp = findProp(others, x, z);

        if (movingBase) {
          if (destinationBase || destinationProp) {
            return failure('That cell already has something on it.');
          }
        } else {
          if (!destinationBase) {
            return failure('Surface props need a base tile beneath them.');
          }
          if (destinationProp) {
            return failure('Something is already sitting there.');
          }
        }

        const movedAt = Date.now();
        set({
          placedItems: state.placedItems.map((entry) => {
            if (entry.id === piece.id) {
              return {
                ...entry,
                x,
                z,
                rotation: state.movingRotation,
                placedAt: movedAt,
              };
            }
            if (attachedProp && entry.id === attachedProp.id) {
              return {
                ...entry,
                x,
                z,
                rotation: ((entry.rotation + rotationDelta) % 4) as Rotation,
                placedAt: movedAt,
              };
            }
            return entry;
          }),
          movingItemId: null,
          movingRotation: 0,
          selectedPieceId: null,
        });
        return {
          ok: true,
          message: attachedProp
            ? `Moved ${item.name} with its surface prop.`
            : `Moved ${item.name}.`,
        };
      },

      cancelMove: () => {
        const movingId = get().movingItemId;
        set({
          movingItemId: null,
          movingRotation: 0,
          selectedPieceId: movingId,
        });
      },

      removeItem: (placedId) => {
        const state = get();
        const piece = state.placedItems.find((entry) => entry.id === placedId);
        if (!piece) return failure('That piece is already gone.');
        const item = itemFor(piece.itemId);
        if (!item) return failure('Unknown item.');
        if (isBasePiece(piece) && findProp(state.placedItems, piece.x, piece.z)) {
          return failure('Store the surface prop first.');
        }
        set({
          placedItems: state.placedItems.filter((entry) => entry.id !== placedId),
          inventory: {
            ...state.inventory,
            [piece.itemId]: Math.min(
              MAX_STOCK,
              (state.inventory[piece.itemId] ?? 0) + 1,
            ),
          },
          movingItemId: state.movingItemId === placedId ? null : state.movingItemId,
          movingRotation: state.movingItemId === placedId ? 0 : state.movingRotation,
          selectedPieceId: state.selectedPieceId === placedId ? null : state.selectedPieceId,
        });
        return { ok: true, message: `Returned ${item.name} to inventory.` };
      },

      removeAtCell: (rawX, rawZ) => {
        const state = get();
        const { x, z } = worldToCell(rawX, rawZ);
        const target =
          findProp(state.placedItems, x, z) ?? findBase(state.placedItems, x, z);
        if (!target) return failure('Nothing to store here.');
        return get().removeItem(target.id);
      },

      resetWorld: () => {
        set({ ...createDefaultData(), ...defaultTransient() });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage()),
      partialize: (state): PersistedWorld => ({
        coins: state.coins,
        tasks: state.tasks,
        inventory: state.inventory,
        placedItems: state.placedItems,
        themeMode: state.themeMode,
        graphicsQuality: state.graphicsQuality,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersisted(persisted),
        hydrated: true,
      }),
    },
  ),
);

export { STORAGE_KEY };
