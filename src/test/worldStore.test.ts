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
    selectedPieceId: null,
    movingItemId: null,
    movingRotation: 0,
    rotation: 0,
    storeMode: false,
    hydrated: true,
  });
}

describe('world store', () => {
  beforeEach(resetWorld);

  it('starts with a 3x3 courtyard, 80 coins, and four props', () => {
    const state = useWorldStore.getState();
    expect(state.coins).toBe(STARTER_COINS);
    expect(state.placedItems).toHaveLength(9);
    expect(state.placedItems.every((piece) => piece.itemId === 'sandstone_tile')).toBe(true);
    expect(state.inventory.stone_lantern).toBe(1);
    expect(state.inventory.rose_planter).toBe(1);
    expect(state.inventory.cottage).toBe(1);
    expect(state.inventory.pine_tree).toBe(1);
    expect(state.themeMode).toBe('day');
    expect(state.graphicsQuality).toBe('high');
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

  it('moves a placed prop to another base tile', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    expect(prop).toBeDefined();
    const stockBefore = useWorldStore.getState().inventory.rose_planter;
    expect(useWorldStore.getState().beginMove(prop!.id).ok).toBe(true);
    const result = useWorldStore.getState().moveTo(1, 0);
    const state = useWorldStore.getState();
    const moved = state.placedItems.find((piece) => piece.id === prop!.id);
    expect(result.ok).toBe(true);
    expect(moved?.x).toBe(1);
    expect(moved?.z).toBe(0);
    expect(state.inventory.rose_planter).toBe(stockBefore);
    expect(state.movingItemId).toBeNull();
  });

  it('moves a base tile together with its surface prop', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const base = findBase(useWorldStore.getState().placedItems, 0, 0);
    expect(base).toBeDefined();
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    expect(useWorldStore.getState().beginMove(base!.id).ok).toBe(true);
    const result = useWorldStore.getState().moveTo(4, 4);
    const state = useWorldStore.getState();
    const movedBase = state.placedItems.find((piece) => piece.id === base!.id);
    const movedProp = state.placedItems.find((piece) => piece.id === prop!.id);
    expect(result.ok).toBe(true);
    expect([movedBase?.x, movedBase?.z]).toEqual([4, 4]);
    expect([movedProp?.x, movedProp?.z]).toEqual([4, 4]);
    expect(state.movingItemId).toBeNull();
  });

  it('keeps an invalid move active until it is cancelled', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().beginMove(prop!.id);
    const result = useWorldStore.getState().moveTo(6, 6);
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().movingItemId).toBe(prop!.id);
    useWorldStore.getState().cancelMove();
    expect(useWorldStore.getState().movingItemId).toBeNull();
    expect(
      useWorldStore.getState().placedItems.find((piece) => piece.id === prop!.id)?.x,
    ).toBe(0);
  });

  it('selects a placed piece without moving it and toggles off', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().selectPiece(prop!.id);
    let state = useWorldStore.getState();
    expect(state.selectedPieceId).toBe(prop!.id);
    expect(state.movingItemId).toBeNull();
    expect(
      state.placedItems.find((piece) => piece.id === prop!.id)?.x,
    ).toBe(0);
    useWorldStore.getState().selectPiece(prop!.id);
    state = useWorldStore.getState();
    expect(state.selectedPieceId).toBeNull();
  });

  it('rotates a selected prop in place', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().selectPiece(prop!.id);
    useWorldStore.getState().rotate();
    const state = useWorldStore.getState();
    const rotated = state.placedItems.find((piece) => piece.id === prop!.id);
    expect(rotated?.rotation).toBe(1);
    expect([rotated?.x, rotated?.z]).toEqual([0, 0]);
    expect(state.selectedPieceId).toBe(prop!.id);
    expect(state.movingItemId).toBeNull();
    expect(state.inventory.rose_planter).toBe(0);
  });

  it('rotates a selected base and its prop without moving either', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const base = findBase(useWorldStore.getState().placedItems, 0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().selectPiece(base!.id);
    useWorldStore.getState().rotate();
    const state = useWorldStore.getState();
    const rotatedBase = state.placedItems.find((piece) => piece.id === base!.id);
    const rotatedProp = state.placedItems.find((piece) => piece.id === prop!.id);
    expect(rotatedBase?.rotation).toBe(1);
    expect(rotatedProp?.rotation).toBe(1);
    expect([rotatedBase?.x, rotatedBase?.z]).toEqual([0, 0]);
    expect([rotatedProp?.x, rotatedProp?.z]).toEqual([0, 0]);
  });

  it('returns to selection when a move is cancelled', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().selectPiece(prop!.id);
    useWorldStore.getState().beginMove(prop!.id);
    expect(useWorldStore.getState().selectedPieceId).toBeNull();
    expect(useWorldStore.getState().movingItemId).toBe(prop!.id);
    useWorldStore.getState().cancelMove();
    expect(useWorldStore.getState().movingItemId).toBeNull();
    expect(useWorldStore.getState().selectedPieceId).toBe(prop!.id);
  });

  it('rotates a lifted placed prop in place', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().beginMove(prop!.id);
    useWorldStore.getState().rotate();
    expect(useWorldStore.getState().movingRotation).toBe(1);
    const result = useWorldStore.getState().moveTo(0, 0);
    const state = useWorldStore.getState();
    expect(result.ok).toBe(true);
    expect(
      state.placedItems.find((piece) => piece.id === prop!.id)?.rotation,
    ).toBe(1);
    expect(state.movingItemId).toBeNull();
    expect(state.inventory.rose_planter).toBe(0);
  });

  it('rotates a lifted base and its attached prop together', () => {
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const base = findBase(useWorldStore.getState().placedItems, 0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().beginMove(base!.id);
    useWorldStore.getState().rotate();
    const result = useWorldStore.getState().moveTo(4, 4);
    const state = useWorldStore.getState();
    expect(result.ok).toBe(true);
    expect(state.placedItems.find((piece) => piece.id === base!.id)?.rotation).toBe(1);
    expect(state.placedItems.find((piece) => piece.id === prop!.id)?.rotation).toBe(1);
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
      graphicsQuality: 'ultra',
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
    expect(clean.graphicsQuality).toBe('high');
    expect(clean.inventory).toEqual({ sandstone_tile: 2 });
    expect(clean.placedItems.map((piece) => piece.id)).toEqual(['a', 'b']);
    expect(clean.tasks).toHaveLength(0);
  });

  it('toggles the graphics quality preset', () => {
    expect(useWorldStore.getState().graphicsQuality).toBe('high');
    useWorldStore.getState().toggleGraphicsQuality();
    expect(useWorldStore.getState().graphicsQuality).toBe('low');
    useWorldStore.getState().toggleGraphicsQuality();
    expect(useWorldStore.getState().graphicsQuality).toBe('high');
  });

  it('resets the whole world', () => {
    useWorldStore.setState({ coins: 1 });
    useWorldStore.getState().resetWorld();
    expect(useWorldStore.getState().coins).toBe(STARTER_COINS);
    expect(useWorldStore.getState().placedItems).toHaveLength(9);
  });
});
