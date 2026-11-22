import { describe, expect, it } from 'vitest';
import { HOTBAR_ORDER, HOTBAR_PAGE_SIZE, ITEMS } from '../data/items';
import {
  HOTBAR_ITEMS,
  HOTBAR_PAGE_COUNT,
  clampHotbarPage,
  getHotbarSlots,
  hotbarPageForItem,
  ownedOnHotbarPage,
} from '../lib/hotbar';

describe('hotbar layout', () => {
  it('keeps every catalog item in a stable nine-slot page', () => {
    expect(new Set(HOTBAR_ORDER)).toEqual(new Set(ITEMS.map((item) => item.id)));
    expect(HOTBAR_ORDER).toHaveLength(ITEMS.length);
    expect(HOTBAR_ITEMS).toHaveLength(ITEMS.length);
    expect(HOTBAR_PAGE_COUNT).toBe(2);
    expect(HOTBAR_PAGE_SIZE).toBe(9);
  });

  it('numbers slots 1-9 on each page', () => {
    expect(getHotbarSlots(0).map(({ slot }) => slot)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(getHotbarSlots(1).map(({ slot }) => slot)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('maps an item to the same page regardless of stock', () => {
    expect(hotbarPageForItem('stone_lantern')).toBe(0);
    expect(hotbarPageForItem('grass_tile')).toBe(0);
    expect(hotbarPageForItem('paper_lantern')).toBe(1);
    expect(hotbarPageForItem('wooden_bench')).toBe(1);
    expect(hotbarPageForItem('not_an_item')).toBe(0);
  });

  it('clamps page navigation', () => {
    expect(clampHotbarPage(-3)).toBe(0);
    expect(clampHotbarPage(0)).toBe(0);
    expect(clampHotbarPage(1)).toBe(1);
    expect(clampHotbarPage(9)).toBe(HOTBAR_PAGE_COUNT - 1);
    expect(clampHotbarPage(Number.NaN)).toBe(0);
  });

  it('counts only owned items on the current page', () => {
    expect(ownedOnHotbarPage(0, {})).toBe(0);
    expect(ownedOnHotbarPage(0, { stone_lantern: 1, grass_tile: 2 })).toBe(2);
    expect(ownedOnHotbarPage(1, { stone_lantern: 1 })).toBe(0);
    expect(ownedOnHotbarPage(1, { wooden_bench: 1 })).toBe(1);
  });
});
