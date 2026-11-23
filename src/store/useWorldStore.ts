import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ITEM_MAP, TASK_REWARDS } from '../data/items';
import { isValidIsoDate } from '../lib/dates';
import { createId } from '../lib/id';
import { cellKey, findBase, findProp, isBasePiece, worldToCell } from '../lib/grid';
import type {
  ActionResult,
  ItemDef,
  PersistedWorld,
  PlacedItem,
  Rotation,
  Task,
  Subtask,
  GraphicsQuality,
  TaskLayout,
  TaskPriority,
  TaskTier,
  ThemeMode,
} from '../types';

const STORAGE_KEY = 'moss-and-ember-v1';
const MAX_TASKS = 200;
const MAX_SUBTASKS = 50;
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
  moveMode: boolean;
  hydrated: boolean;
  addTask: (
    title: string,
    tier: TaskTier,
    priority?: TaskPriority,
    dueDate?: string | null,
    subtaskTitles?: string[],
  ) => ActionResult;
  addSubtask: (taskId: string, title: string) => ActionResult;
  toggleSubtask: (taskId: string, subtaskId: string) => ActionResult;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => ActionResult;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  toggleTask: (id: string) => ActionResult;
  deleteTask: (id: string) => void;
  setTaskPriority: (id: string, priority: TaskPriority) => ActionResult;
  setTaskDueDate: (id: string, dueDate: string | null) => ActionResult;
  toggleTaskPin: (id: string) => ActionResult;
  togglePinAllIncompleteTasks: () => ActionResult;
  buyItem: (itemId: string) => ActionResult;
  sellItem: (itemId: string) => ActionResult;
  selectItem: (itemId: string | null) => void;
  selectPiece: (placedId: string | null) => void;
  rotate: () => void;
  toggleTheme: () => void;
  toggleStoreMode: () => void;
  toggleMoveMode: () => ActionResult;
  toggleGraphicsQuality: () => void;
  setTaskLayout: (layout: TaskLayout) => void;
  placeAt: (x: number, z: number) => ActionResult;
  beginMove: (placedId: string) => ActionResult;
  moveTo: (x: number, z: number) => ActionResult;
  cancelMove: () => void;
  sellPlacedItem: (placedId: string) => ActionResult;
  removeItem: (placedId: string) => ActionResult;
  removeAtCell: (x: number, z: number) => ActionResult;
  resetWorld: () => void;
}

export function createDefaultData(): PersistedWorld {
  return {
    coins: 0,
    tasks: [],
    inventory: {},
    placedItems: [],
    themeMode: 'day',
    graphicsQuality: 'high',
    taskLayout: 'bar',
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
    moveMode: false,
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

function validPriority(value: unknown): value is TaskPriority {
  return value === 'low' || value === 'medium' || value === 'high';
}

function sanitizeSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const subtasks: Subtask[] = [];
  for (const raw of value.slice(0, MAX_SUBTASKS)) {
    if (!isRecord(raw)) continue;
    const title = cleanString(raw.title, 120);
    if (!title) continue;
    let id = cleanString(raw.id, 80) ?? createId('subtask');
    if (seen.has(id)) id = createId('subtask');
    seen.add(id);
    subtasks.push({ id, title, done: raw.done === true });
  }
  return subtasks;
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
      priority: validPriority(raw.priority) ? raw.priority : 'medium',
      done: raw.done === true,
      createdAt,
      pinned: raw.pinned === true,
      subtasks: sanitizeSubtasks(raw.subtasks),
    };
    if (isValidIsoDate(raw.dueDate)) task.dueDate = raw.dueDate;
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
    coins: clampInt(value.coins, 0, MAX_COINS, 0),
    tasks,
    inventory,
    placedItems,
    themeMode: value.themeMode === 'night' ? 'night' : 'day',
    graphicsQuality: value.graphicsQuality === 'low' ? 'low' : 'high',
    taskLayout: value.taskLayout === 'tab' ? 'tab' : 'bar',
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

      addTask: (
        title,
        tier,
        priority = 'medium',
        dueDate = null,
        subtaskTitles = [],
      ) => {
        const clean = title.trim().replace(/\s+/g, ' ');
        if (!clean) return failure('Give the task a short name first.');
        if (clean.length > 120) return failure('Keep task names under 120 characters.');
        if (get().tasks.length >= MAX_TASKS) return failure('Task list is full.');
        const task: Task = {
          id: createId('task'),
          title: clean,
          tier,
          priority: validPriority(priority) ? priority : 'medium',
          done: false,
          createdAt: Date.now(),
          subtasks: [],
        };
        for (const raw of subtaskTitles.slice(0, MAX_SUBTASKS)) {
          const subtaskTitle = cleanString(raw, 120);
          if (subtaskTitle) {
            task.subtasks.push({
              id: createId('subtask'),
              title: subtaskTitle,
              done: false,
            });
          }
        }
        if (isValidIsoDate(dueDate)) task.dueDate = dueDate;
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return { ok: true, message: `Added “${clean}”.` };
      },

      addSubtask: (taskId, title) => {
        const task = get().tasks.find((entry) => entry.id === taskId);
        if (!task) return failure('That task no longer exists.');
        const clean = title.trim().replace(/\s+/g, ' ');
        if (!clean) return failure('Give the subtask a short name first.');
        if (clean.length > 120) {
          return failure('Keep subtasks under 120 characters.');
        }
        if (task.subtasks.length >= MAX_SUBTASKS) {
          return failure('This task has too many subtasks.');
        }
        const subtask: Subtask = {
          id: createId('subtask'),
          title: clean,
          done: false,
        };
        set((state) => ({
          tasks: state.tasks.map((entry) =>
            entry.id === taskId
              ? { ...entry, subtasks: [...entry.subtasks, subtask] }
              : entry,
          ),
        }));
        return { ok: true, message: `Added subtask “${clean}”.` };
      },

      toggleSubtask: (taskId, subtaskId) => {
        const task = get().tasks.find((entry) => entry.id === taskId);
        if (!task) return failure('That task no longer exists.');
        const subtask = task.subtasks.find((entry) => entry.id === subtaskId);
        if (!subtask) return failure('That subtask no longer exists.');
        set((state) => ({
          tasks: state.tasks.map((entry) =>
            entry.id === taskId
              ? {
                  ...entry,
                  subtasks: entry.subtasks.map((item) =>
                    item.id === subtaskId ? { ...item, done: !item.done } : item,
                  ),
                }
              : entry,
          ),
        }));
        return { ok: true, message: subtask.done ? 'Subtask reopened.' : 'Subtask complete.' };
      },

      updateSubtask: (taskId, subtaskId, title) => {
        const task = get().tasks.find((entry) => entry.id === taskId);
        if (!task) return failure('That task no longer exists.');
        const subtask = task.subtasks.find((entry) => entry.id === subtaskId);
        if (!subtask) return failure('That subtask no longer exists.');
        const clean = title.trim().replace(/\s+/g, ' ');
        if (!clean) return failure('Give the subtask a short name first.');
        if (clean.length > 120) {
          return failure('Keep subtasks under 120 characters.');
        }
        set((state) => ({
          tasks: state.tasks.map((entry) =>
            entry.id === taskId
              ? {
                  ...entry,
                  subtasks: entry.subtasks.map((item) =>
                    item.id === subtaskId ? { ...item, title: clean } : item,
                  ),
                }
              : entry,
          ),
        }));
        return { ok: true, message: `Updated subtask “${clean}”.` };
      },

      deleteSubtask: (taskId, subtaskId) => {
        set((state) => ({
          tasks: state.tasks.map((entry) =>
            entry.id === taskId
              ? {
                  ...entry,
                  subtasks: entry.subtasks.filter((item) => item.id !== subtaskId),
                }
              : entry,
          ),
        }));
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
              ? { ...entry, done: true, completedAt: Date.now(), pinned: false }
              : entry,
          ),
        }));
        return { ok: true, message: `Task complete · +${reward} coins`, reward };
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },

      setTaskPriority: (id, priority) => {
        const task = get().tasks.find((entry) => entry.id === id);
        if (!task) return failure('That task no longer exists.');
        if (!validPriority(priority)) return failure('Unknown priority.');
        set((state) => ({
          tasks: state.tasks.map((entry) =>
            entry.id === id ? { ...entry, priority } : entry,
          ),
        }));
        return { ok: true, message: `Priority set to ${priority}.` };
      },

      setTaskDueDate: (id, dueDate) => {
        const task = get().tasks.find((entry) => entry.id === id);
        if (!task) return failure('That task no longer exists.');
        if (dueDate !== null && !isValidIsoDate(dueDate)) {
          return failure('Pick a valid deadline.');
        }
        set((state) => ({
          tasks: state.tasks.map((entry) => {
            if (entry.id !== id) return entry;
            const next = { ...entry };
            if (dueDate === null) delete next.dueDate;
            else next.dueDate = dueDate;
            return next;
          }),
        }));
        return {
          ok: true,
          message: dueDate ? 'Deadline saved.' : 'Deadline cleared.',
        };
      },

      toggleTaskPin: (id) => {
        const task = get().tasks.find((entry) => entry.id === id);
        if (!task) return failure('That task no longer exists.');
        if (task.done) return failure('Completed tasks stay in the list.');
        set((state) => ({
          tasks: state.tasks.map((entry) =>
            entry.id === id ? { ...entry, pinned: !entry.pinned } : entry,
          ),
        }));
        return {
          ok: true,
          message: task.pinned
            ? `Unpinned “${task.title}”.`
            : `Pinned “${task.title}” to the top.`,
        };
      },

      togglePinAllIncompleteTasks: () => {
        const pending = get().tasks.filter((task) => !task.done);
        if (pending.length === 0) return failure('Add an unfinished task first.');
        const allPinned = pending.every((task) => task.pinned);
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.done ? task : { ...task, pinned: !allPinned },
          ),
        }));
        return {
          ok: true,
          message: allPinned
            ? 'Unpinned all unfinished tasks.'
            : 'Pinned all unfinished tasks to the top.',
        };
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

      sellItem: (itemId) => {
        const item = itemFor(itemId);
        if (!item) return failure('Unknown item.');
        const owned = get().inventory[itemId] ?? 0;
        if (owned <= 0) return failure('None of that item to sell.');
        set((state) => {
          const inventory = { ...state.inventory };
          if (owned <= 1) delete inventory[itemId];
          else inventory[itemId] = owned - 1;
          return {
            coins: Math.min(MAX_COINS, state.coins + item.cost),
            inventory,
            selectedItemId:
              state.selectedItemId === itemId && owned <= 1
                ? null
                : state.selectedItemId,
          };
        });
        return {
          ok: true,
          message: `Sold ${item.name} · +${item.cost} coins`,
          reward: item.cost,
        };
      },

      selectItem: (itemId) => {
        if (itemId === null) {
          set({
            selectedItemId: null,
            selectedPieceId: null,
            storeMode: false,
            moveMode: false,
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
          moveMode: false,
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
          moveMode: false,
          movingItemId: null,
          movingRotation: 0,
        }));
      },

      setTaskLayout: (layout) => {
        set({ taskLayout: layout });
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
          moveMode: false,
          movingItemId: null,
          movingRotation: 0,
        }));
      },

      toggleMoveMode: () => {
        const state = get();
        if (state.moveMode) {
          set({
            moveMode: false,
            movingItemId: null,
            movingRotation: 0,
            selectedPieceId: null,
          });
          return { ok: true, message: 'Move mode off.' };
        }
        if (state.selectedPieceId) {
          const result = get().beginMove(state.selectedPieceId);
          if (!result.ok) return result;
          set({ moveMode: true });
          return result;
        }
        set({
          moveMode: true,
          selectedItemId: null,
          selectedPieceId: null,
          storeMode: false,
          movingItemId: null,
          movingRotation: 0,
        });
        return { ok: true, message: 'Move mode. Click a placed piece.' };
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
          moveMode: false,
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
          moveMode: true,
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
          set({
            movingItemId: null,
            movingRotation: 0,
            selectedPieceId: null,
          });
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
          moveMode: false,
        });
      },

      sellPlacedItem: (placedId) => {
        const state = get();
        const piece = state.placedItems.find((entry) => entry.id === placedId);
        if (!piece) return failure('That piece is already gone.');
        const item = itemFor(piece.itemId);
        if (!item) return failure('Unknown item.');
        if (isBasePiece(piece) && findProp(state.placedItems, piece.x, piece.z)) {
          return failure('Sell or move the surface prop first.');
        }
        set({
          placedItems: state.placedItems.filter((entry) => entry.id !== placedId),
          coins: Math.min(MAX_COINS, state.coins + item.cost),
          movingItemId: state.movingItemId === placedId ? null : state.movingItemId,
          movingRotation: state.movingItemId === placedId ? 0 : state.movingRotation,
          selectedPieceId:
            state.selectedPieceId === placedId ? null : state.selectedPieceId,
          moveMode: false,
        });
        return {
          ok: true,
          message: `Sold ${item.name} · +${item.cost} coins`,
          reward: item.cost,
        };
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
          moveMode: false,
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
        const taskLayout = get().taskLayout;
        set({ ...createDefaultData(), ...defaultTransient(), taskLayout });
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
        taskLayout: state.taskLayout,
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
