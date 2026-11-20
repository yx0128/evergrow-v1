import { beforeEach, describe, expect, it } from 'vitest';
import { STARTER_COINS, TASK_REWARDS } from '../data/items';
import { findBase } from '../lib/grid';
import {
  createDefaultData,
  sanitizePersisted,
  useWorldStore,
} from '../store/useWorldStore';

function resetWorld() {
  window.localStorage.clear();
  useWorldStore.setState({
    ...createDefaultData(),
    selectedItemId: null,
    rotation: 0,
    storeMode: false,
    hydrated: true,
  });
}

describe('world store', () => {
  beforeEach(resetWorld);

  it('starts with a 3x3 courtyard, 80 coins, and two props', () => {
    const state = useWorldStore.getState();
    expect(state.coins).toBe(STARTER_COINS);
    expect(state.placedItems).toHaveLength(9);
    expect(state.placedItems.every((piece) => piece.itemId === 'sandstone_tile')).toBe(true);
    expect(state.inventory.stone_lantern).toBe(1);
    expect(state.inventory.rose_planter).toBe(1);
    expect(state.themeMode).toBe('day');
  });

  it('buys an item into inventory and deducts coins', () => {
    const result = useWorldStore.getState().buyItem('grass_tile');
    const state = useWorldStore.getState();
    expect(result.ok).toBe(true);
    expect(state.coins).toBe(STARTER_COINS - 14);
    expect(state.inventory.grass_tile).toBe(1);
  });

  it('rejects purchases when coins are insufficient', () => {
    useWorldStore.setState({ coins: 5 });
    const result = useWorldStore.getState().buyItem('blossom_tree');
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().coins).toBe(5);
    expect(useWorldStore.getState().inventory.blossom_tree).toBeUndefined();
  });

  it('pays a quick task exactly once', () => {
    const task = useWorldStore.getState().tasks.find((entry) => entry.tier === 'quick');
    expect(task).toBeDefined();
    const first = useWorldStore.getState().toggleTask(task!.id);
    const second = useWorldStore.getState().toggleTask(task!.id);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(useWorldStore.getState().coins).toBe(STARTER_COINS + TASK_REWARDS.quick);
  });

  it('creates and completes a deep-work task for 50 coins', () => {
    const added = useWorldStore.getState().addTask('Finish the draft', 'deep');
    expect(added.ok).toBe(true);
    const task = useWorldStore.getState().tasks[0];
    useWorldStore.getState().toggleTask(task.id);
    expect(useWorldStore.getState().coins).toBe(STARTER_COINS + 50);
  });

  it('places a purchased base tile and clears selection at zero stock', () => {
    useWorldStore.getState().buyItem('grass_tile');
    useWorldStore.getState().selectItem('grass_tile');
    const result = useWorldStore.getState().placeAt(5, 5);
    const state = useWorldStore.getState();
    expect(result.ok).toBe(true);
    expect(state.inventory.grass_tile).toBe(0);
    expect(state.selectedItemId).toBeNull();
    expect(state.placedItems).toHaveLength(10);
  });

  it('requires a base tile beneath surface props', () => {
    useWorldStore.getState().selectItem('stone_lantern');
    const result = useWorldStore.getState().placeAt(6, 6);
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().placedItems).toHaveLength(9);
  });

  it('rejects a second base tile on an occupied cell', () => {
    useWorldStore.getState().buyItem('slate_tile');
    useWorldStore.getState().selectItem('slate_tile');
    const result = useWorldStore.getState().placeAt(0, 0);
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().inventory.slate_tile).toBe(1);
  });

  it('rejects two props in the same cell', () => {
    useWorldStore.getState().selectItem('rose_planter');
    expect(useWorldStore.getState().placeAt(0, 0).ok).toBe(true);
    useWorldStore.getState().selectItem('stone_lantern');
    const result = useWorldStore.getState().placeAt(0, 0);
    expect(result.ok).toBe(false);
  });

  it('returns a stored prop to inventory', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    expect(prop).toBeDefined();
    const result = useWorldStore.getState().removeItem(prop!.id);
    expect(result.ok).toBe(true);
    expect(useWorldStore.getState().inventory.rose_planter).toBe(1);
    expect(useWorldStore.getState().placedItems).toHaveLength(9);
  });

  it('refuses to store a base tile that still holds a prop', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const base = findBase(useWorldStore.getState().placedItems, 0, 0);
    expect(base).toBeDefined();
    const result = useWorldStore.getState().removeItem(base!.id);
    expect(result.ok).toBe(false);
  });

  it('rotates in 90-degree steps and wraps', () => {
    useWorldStore.getState().rotate();
    expect(useWorldStore.getState().rotation).toBe(1);
    useWorldStore.getState().rotate();
    useWorldStore.getState().rotate();
    useWorldStore.getState().rotate();
    expect(useWorldStore.getState().rotation).toBe(0);
  });

  it('sanitizes hostile persisted data', () => {
    const clean = sanitizePersisted({
      coins: -50,
      themeMode: 'lava',
      inventory: { sandstone_tile: 2, fake_item: 99 },
      placedItems: [
        { id: 'a', itemId: 'sandstone_tile', x: 0, z: 0, rotation: 0, placedAt: 1 },
        { id: 'b', itemId: 'rose_planter', x: 0, z: 0, rotation: 0, placedAt: 1 },
        { id: 'c', itemId: 'rose_planter', x: 9, z: 9, rotation: 0, placedAt: 1 },
        { id: 'd', itemId: 'fake_item', x: 1, z: 1, rotation: 0, placedAt: 1 },
      ],
      tasks: [{ id: 't', title: '  ', tier: 'quick', done: false }],
    });
    expect(clean.coins).toBe(0);
    expect(clean.themeMode).toBe('day');
    expect(clean.inventory).toEqual({ sandstone_tile: 2 });
    expect(clean.placedItems.map((piece) => piece.id)).toEqual(['a', 'b']);
    expect(clean.tasks).toHaveLength(0);
  });

  it('resets the whole world', () => {
    useWorldStore.setState({ coins: 1 });
    useWorldStore.getState().resetWorld();
    expect(useWorldStore.getState().coins).toBe(STARTER_COINS);
    expect(useWorldStore.getState().placedItems).toHaveLength(9);
  });
});
