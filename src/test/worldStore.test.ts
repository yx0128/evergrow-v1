import { beforeEach, describe, expect, it } from 'vitest';
import { TASK_REWARDS } from '../data/items';
import { findBase } from '../lib/grid';
import { orderTasks } from '../lib/tasks';
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
    moveMode: false,
    hydrated: true,
  });
}

function stock(inventory: Record<string, number>, coins = 0) {
  useWorldStore.setState({ inventory: { ...inventory }, coins });
}

describe('world store', () => {
  beforeEach(resetWorld);

  it('starts with an empty world', () => {
    const state = useWorldStore.getState();
    expect(state.coins).toBe(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.placedItems).toHaveLength(0);
    expect(state.inventory).toEqual({});
    expect(state.themeMode).toBe('day');
    expect(state.graphicsQuality).toBe('high');
  });

  it('buys an item into inventory and deducts coins', () => {
    stock({}, 100);
    const result = useWorldStore.getState().buyItem('grass_tile');
    const state = useWorldStore.getState();
    expect(result.ok).toBe(true);
    expect(state.coins).toBe(100 - 14);
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
    useWorldStore.getState().addTask('Pour water', 'quick');
    const task = useWorldStore.getState().tasks[0];
    const first = useWorldStore.getState().toggleTask(task.id);
    const second = useWorldStore.getState().toggleTask(task.id);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(useWorldStore.getState().coins).toBe(TASK_REWARDS.quick);
  });

  it('creates and completes a deep-work task for 50 coins', () => {
    const added = useWorldStore.getState().addTask('Finish the draft', 'deep');
    expect(added.ok).toBe(true);
    const task = useWorldStore.getState().tasks[0];
    useWorldStore.getState().toggleTask(task.id);
    expect(useWorldStore.getState().coins).toBe(50);
  });

  it('places a purchased base tile and clears selection at zero stock', () => {
    stock({}, 100);
    useWorldStore.getState().buyItem('grass_tile');
    useWorldStore.getState().selectItem('grass_tile');
    const result = useWorldStore.getState().placeAt(5, 5);
    const state = useWorldStore.getState();
    expect(result.ok).toBe(true);
    expect(state.inventory.grass_tile).toBe(0);
    expect(state.selectedItemId).toBeNull();
    expect(state.placedItems).toHaveLength(1);
  });

  it('requires a base tile beneath surface props', () => {
    stock({ stone_lantern: 1 });
    useWorldStore.getState().selectItem('stone_lantern');
    const result = useWorldStore.getState().placeAt(6, 6);
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().placedItems).toHaveLength(0);
  });

  it('rejects a second base tile on an occupied cell', () => {
    stock({ slate_tile: 2 });
    useWorldStore.getState().selectItem('slate_tile');
    useWorldStore.getState().placeAt(0, 0);
    const result = useWorldStore.getState().placeAt(0, 0);
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().inventory.slate_tile).toBe(1);
  });

  it('rejects two props in the same cell', () => {
    stock({ rose_planter: 1, stone_lantern: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().selectItem('rose_planter');
    expect(useWorldStore.getState().placeAt(0, 0).ok).toBe(true);
    useWorldStore.getState().selectItem('stone_lantern');
    const result = useWorldStore.getState().placeAt(0, 0);
    expect(result.ok).toBe(false);
  });

  it('returns a stored prop to inventory', () => {
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    expect(prop).toBeDefined();
    const result = useWorldStore.getState().removeItem(prop!.id);
    expect(result.ok).toBe(true);
    expect(useWorldStore.getState().inventory.rose_planter).toBe(1);
    expect(useWorldStore.getState().placedItems).toHaveLength(1);
  });

  it('refuses to store a base tile that still holds a prop', () => {
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const base = findBase(useWorldStore.getState().placedItems, 0, 0);
    expect(base).toBeDefined();
    const result = useWorldStore.getState().removeItem(base!.id);
    expect(result.ok).toBe(false);
  });

  it('moves a placed prop to another base tile', () => {
    stock({ rose_planter: 1, sandstone_tile: 2 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().placeAt(1, 0);
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
    expect(state.moveMode).toBe(true);

    const off = useWorldStore.getState().toggleMoveMode();
    expect(off.ok).toBe(true);
    expect(useWorldStore.getState().moveMode).toBe(false);
  });

  it('moves a base tile together with its surface prop', () => {
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().beginMove(prop!.id);
    const result = useWorldStore.getState().moveTo(6, 6);
    expect(result.ok).toBe(false);
    expect(useWorldStore.getState().movingItemId).toBe(prop!.id);
    expect(useWorldStore.getState().moveMode).toBe(true);
    useWorldStore.getState().cancelMove();
    expect(useWorldStore.getState().movingItemId).toBeNull();
    expect(useWorldStore.getState().moveMode).toBe(false);
    expect(
      useWorldStore.getState().placedItems.find((piece) => piece.id === prop!.id)?.x,
    ).toBe(0);
  });

  it('toggles move mode from the move control', () => {
    stock({ rose_planter: 1 });
    const on = useWorldStore.getState().toggleMoveMode();
    expect(on.ok).toBe(true);
    expect(useWorldStore.getState().moveMode).toBe(true);
    expect(useWorldStore.getState().selectedItemId).toBeNull();

    useWorldStore.getState().selectItem('rose_planter');
    expect(useWorldStore.getState().moveMode).toBe(false);

    const second = useWorldStore.getState().toggleMoveMode();
    expect(second.ok).toBe(true);
    expect(useWorldStore.getState().moveMode).toBe(true);

    const off = useWorldStore.getState().toggleMoveMode();
    expect(off.ok).toBe(true);
    expect(useWorldStore.getState().moveMode).toBe(false);
  });

  it('lifts a selected piece when move mode starts and clears it on cancel', () => {
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter');
    useWorldStore.getState().selectPiece(prop!.id);

    const result = useWorldStore.getState().toggleMoveMode();
    expect(result.ok).toBe(true);
    expect(useWorldStore.getState().moveMode).toBe(true);
    expect(useWorldStore.getState().movingItemId).toBe(prop!.id);

    useWorldStore.getState().cancelMove();
    expect(useWorldStore.getState().moveMode).toBe(false);
    expect(useWorldStore.getState().movingItemId).toBeNull();
  });

  it('selects a placed piece without moving it and toggles off', () => {
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
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

  it('remembers the chosen task layout and keeps it across reset', () => {
    expect(useWorldStore.getState().taskLayout).toBe('bar');
    useWorldStore.getState().setTaskLayout('tab');
    expect(useWorldStore.getState().taskLayout).toBe('tab');
    useWorldStore.getState().resetWorld();
    expect(useWorldStore.getState().taskLayout).toBe('tab');
    expect(sanitizePersisted({ taskLayout: 'tab' }).taskLayout).toBe('tab');
    expect(sanitizePersisted({ taskLayout: 'grid' }).taskLayout).toBe('bar');
  });

  it('toggles the graphics quality preset', () => {
    expect(useWorldStore.getState().graphicsQuality).toBe('high');
    useWorldStore.getState().toggleGraphicsQuality();
    expect(useWorldStore.getState().graphicsQuality).toBe('low');
    useWorldStore.getState().toggleGraphicsQuality();
    expect(useWorldStore.getState().graphicsQuality).toBe('high');
  });

  it('pins incomplete tasks above the rest and unpins on completion', () => {
    useWorldStore.getState().addTask('Tidy a surface', 'standard');
    useWorldStore.getState().addTask('Write for 25 minutes', 'deep');
    const target = useWorldStore.getState().tasks[1];
    const result = useWorldStore.getState().toggleTaskPin(target.id);
    expect(result.ok).toBe(true);
    expect(useWorldStore.getState().tasks.find((task) => task.id === target.id)?.pinned).toBe(true);
    expect(orderTasks(useWorldStore.getState().tasks)[0].id).toBe(target.id);

    const completed = useWorldStore.getState().toggleTask(target.id);
    expect(completed.ok).toBe(true);
    const pinnedAfter = useWorldStore.getState().tasks.find((task) => task.id === target.id);
    expect(pinnedAfter?.pinned).toBe(false);
    expect(orderTasks(useWorldStore.getState().tasks)[0].id).not.toBe(target.id);

    const donePin = useWorldStore.getState().toggleTaskPin(target.id);
    expect(donePin.ok).toBe(false);
  });

  it('pins or unpins every unfinished task at once', () => {
    useWorldStore.getState().addTask('One', 'quick');
    useWorldStore.getState().addTask('Two', 'standard');
    const completedId = useWorldStore.getState().tasks[0].id;
    useWorldStore.getState().toggleTask(completedId);

    const pinned = useWorldStore.getState().togglePinAllIncompleteTasks();
    expect(pinned.ok).toBe(true);
    const pinnedState = useWorldStore.getState();
    expect(
      pinnedState.tasks.filter((task) => !task.done).every((task) => task.pinned === true),
    ).toBe(true);
    expect(
      pinnedState.tasks.find((task) => task.id === completedId)?.pinned,
    ).toBe(false);

    const unpinned = useWorldStore.getState().togglePinAllIncompleteTasks();
    expect(unpinned.ok).toBe(true);
    expect(
      useWorldStore
        .getState()
        .tasks.filter((task) => !task.done)
        .every((task) => task.pinned === false),
    ).toBe(true);
  });

  it('sells inventory items for a full refund', () => {
    stock({}, 100);
    useWorldStore.getState().buyItem('grass_tile');
    expect(useWorldStore.getState().coins).toBe(86);
    expect(useWorldStore.getState().inventory.grass_tile).toBe(1);

    const sold = useWorldStore.getState().sellItem('grass_tile');
    expect(sold.ok).toBe(true);
    expect(useWorldStore.getState().coins).toBe(100);
    expect(useWorldStore.getState().inventory.grass_tile).toBeUndefined();

    expect(useWorldStore.getState().sellItem('grass_tile').ok).toBe(false);
    expect(useWorldStore.getState().coins).toBe(100);
  });

  it('sells placed pieces for a full refund', () => {
    stock({ rose_planter: 1, sandstone_tile: 1 });
    useWorldStore.getState().selectItem('sandstone_tile');
    useWorldStore.getState().placeAt(0, 0);
    useWorldStore.getState().selectItem('rose_planter');
    useWorldStore.getState().placeAt(0, 0);
    const base = findBase(useWorldStore.getState().placedItems, 0, 0)!;
    const prop = useWorldStore
      .getState()
      .placedItems.find((piece) => piece.itemId === 'rose_planter')!;

    expect(useWorldStore.getState().sellPlacedItem(base.id).ok).toBe(false);
    expect(useWorldStore.getState().coins).toBe(0);

    const soldProp = useWorldStore.getState().sellPlacedItem(prop.id);
    expect(soldProp.ok).toBe(true);
    expect(useWorldStore.getState().coins).toBe(30);
    expect(useWorldStore.getState().placedItems).toHaveLength(1);

    const soldBase = useWorldStore.getState().sellPlacedItem(base.id);
    expect(soldBase.ok).toBe(true);
    expect(useWorldStore.getState().coins).toBe(31);
    expect(useWorldStore.getState().placedItems).toHaveLength(0);
  });

  it('stores a priority when adding a task and updates it later', () => {
    useWorldStore.getState().addTask('Plan the week', 'standard', 'high');
    const task = useWorldStore.getState().tasks[0];
    expect(task.priority).toBe('high');

    const result = useWorldStore.getState().setTaskPriority(task.id, 'low');
    expect(result.ok).toBe(true);
    expect(useWorldStore.getState().tasks[0].priority).toBe('low');
    expect(useWorldStore.getState().setTaskPriority('missing', 'high').ok).toBe(false);
  });

  it('defaults missing priority to medium while sanitizing', () => {
    const clean = sanitizePersisted({
      tasks: [{ id: 't1', title: 'Legacy task', tier: 'quick', done: false }],
    });
    expect(clean.tasks[0].priority).toBe('medium');
  });

  it('stores and clears a deadline', () => {
    useWorldStore.getState().addTask('File the note', 'quick', 'medium', '2026-12-01');
    const task = useWorldStore.getState().tasks[0];
    expect(task.dueDate).toBe('2026-12-01');

    expect(useWorldStore.getState().setTaskDueDate(task.id, '2027-01-15').ok).toBe(true);
    expect(useWorldStore.getState().tasks[0].dueDate).toBe('2027-01-15');

    expect(useWorldStore.getState().setTaskDueDate(task.id, 'not-a-date').ok).toBe(false);
    expect(useWorldStore.getState().tasks[0].dueDate).toBe('2027-01-15');

    expect(useWorldStore.getState().setTaskDueDate(task.id, null).ok).toBe(true);
    expect(useWorldStore.getState().tasks[0].dueDate).toBeUndefined();
  });

  it('drops impossible deadlines while sanitizing', () => {
    const clean = sanitizePersisted({
      tasks: [
        { id: 't1', title: 'Legacy task', tier: 'quick', done: false, dueDate: '2026-02-31' },
      ],
    });
    expect(clean.tasks[0].dueDate).toBeUndefined();
  });

  it('creates a task with initial subtasks', () => {
    const added = useWorldStore
      .getState()
      .addTask('Pack the bag', 'standard', 'medium', null, ['Map', '  Water  ']);
    expect(added.ok).toBe(true);
    const subtasks = useWorldStore.getState().tasks[0].subtasks;
    expect(subtasks.map((subtask) => subtask.title)).toEqual(['Map', 'Water']);
    expect(subtasks.every((subtask) => subtask.done === false)).toBe(true);
  });

  it('adds, toggles, and deletes subtasks without paying coins', () => {
    useWorldStore.getState().addTask('Pack the bag', 'standard');
    const task = useWorldStore.getState().tasks[0];
    const added = useWorldStore.getState().addSubtask(task.id, 'Find the map');
    expect(added.ok).toBe(true);
    const subtask = useWorldStore.getState().tasks[0].subtasks[0];
    expect(subtask.title).toBe('Find the map');
    expect(useWorldStore.getState().tasks[0].subtasks).toHaveLength(1);

    const toggled = useWorldStore.getState().toggleSubtask(task.id, subtask.id);
    expect(toggled.ok).toBe(true);
    expect(useWorldStore.getState().tasks[0].subtasks[0].done).toBe(true);
    expect(useWorldStore.getState().coins).toBe(0);

    const updated = useWorldStore.getState().updateSubtask(task.id, subtask.id, 'Find the old map');
    expect(updated.ok).toBe(true);
    expect(useWorldStore.getState().tasks[0].subtasks[0].title).toBe('Find the old map');
    expect(useWorldStore.getState().updateSubtask(task.id, subtask.id, '  ').ok).toBe(false);

    useWorldStore.getState().deleteSubtask(task.id, subtask.id);
    expect(useWorldStore.getState().tasks[0].subtasks).toHaveLength(0);
  });

  it('drops malformed subtasks while sanitizing', () => {
    const clean = sanitizePersisted({
      subtasks: [],
      tasks: [
        {
          id: 't1',
          title: 'Real task',
          tier: 'quick',
          done: false,
          subtasks: [
            { id: 's1', title: 'Keep me', done: true },
            { id: 's2', title: '   ', done: false },
            { id: 's1', title: 'Duplicate id', done: false },
            'nope',
          ],
        },
      ],
    });
    expect(clean.tasks[0].subtasks).toHaveLength(2);
    expect(clean.tasks[0].subtasks[0]).toMatchObject({ title: 'Keep me', done: true });
    expect(clean.tasks[0].subtasks[1].title).toBe('Duplicate id');
    expect(clean.tasks[0].subtasks[1].id).not.toBe('s1');
  });

  it('resets the whole world to an empty start', () => {
    stock({ rose_planter: 1 }, 120);
    useWorldStore.getState().addTask('One', 'quick');
    useWorldStore.getState().resetWorld();
    const state = useWorldStore.getState();
    expect(state.coins).toBe(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.placedItems).toHaveLength(0);
    expect(state.inventory).toEqual({});
  });
});
