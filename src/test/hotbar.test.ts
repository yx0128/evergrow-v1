import { describe, expect, it } from 'vitest';
import { HOTBAR_ORDER, ITEMS } from '../data/items';
import {
  HOTBAR_GROUPS,
  HOTBAR_ITEMS,
  HOTBAR_VIEWS,
  defaultHotbarGroup,
  getHotbarItems,
  getHotbarViewItems,
  hotbarGroupForItem,
  ownedInGroup,
} from '../lib/hotbar';
import type { HotbarGroup } from '../types';

describe('hotbar groups', () => {
  it('places every catalog item in exactly one category', () => {
    expect(new Set(HOTBAR_ORDER)).toEqual(new Set(ITEMS.map((item) => item.id)));
    expect(HOTBAR_ITEMS).toHaveLength(ITEMS.length);
    const grouped = HOTBAR_GROUPS.flatMap((group) => getHotbarItems(group.id));
    expect(grouped).toHaveLength(HOTBAR_ITEMS.length);
    expect(new Set(grouped.map((item) => item.id)).size).toBe(HOTBAR_ITEMS.length);
  });

  it('exposes the four categories plus an All view', () => {
    expect(HOTBAR_GROUPS.map((group) => group.label)).toEqual([
      'Terrain',
      'Buildings',
      'Nature',
      'Decor',
    ]);
    expect(HOTBAR_VIEWS.map((view) => view.label)).toEqual([
      'All',
      'Terrain',
      'Buildings',
      'Nature',
      'Decor',
    ]);
  });

  it('maps items to their group', () => {
    expect(hotbarGroupForItem('grass_tile')).toBe('terrain');
    expect(hotbarGroupForItem('rose_planter')).toBe('nature');
    expect(hotbarGroupForItem('firepot')).toBe('decor');
    expect(hotbarGroupForItem('cottage')).toBe('buildings');
    expect(hotbarGroupForItem('not_an_item')).toBe('terrain');
  });

  it('counts owned items per group', () => {
    const groups: HotbarGroup[] = ['terrain', 'nature', 'decor', 'buildings'];
    expect(groups.map((group) => ownedInGroup(group, {}))).toEqual([0, 0, 0, 0]);
    expect(
      ownedInGroup('nature', { rose_planter: 1, pine_tree: 2 }),
    ).toBe(2);
    expect(ownedInGroup('decor', { rose_planter: 1 })).toBe(0);
  });

  it('sorts owned items before unowned, then by category order', () => {
    const inventory = { rose_planter: 1, wooden_bench: 1 };
    const all = getHotbarViewItems('all', inventory);
    expect(all).toHaveLength(18);
    expect(all.slice(0, 2).map((item) => item.id)).toEqual([
      'rose_planter',
      'wooden_bench',
    ]);
    const firstUnowned = all.findIndex(
      (item) => (inventory[item.id as keyof typeof inventory] ?? 0) === 0,
    );
    expect(firstUnowned).toBe(2);
    expect(all.slice(0, firstUnowned).every((item) => inventory[item.id as keyof typeof inventory])).toBe(true);
    expect(all[firstUnowned].hotbarGroup).toBe('terrain');
  });

  it('puts owned items first inside a single category', () => {
    const terrain = getHotbarViewItems('terrain', { water_basin: 1 });
    expect(terrain[0].id).toBe('water_basin');
    expect(terrain.filter((item) => item.id !== 'water_basin').every((item) => item.hotbarGroup === 'terrain')).toBe(true);
  });

  it('opens on the first group that has owned stock', () => {
    expect(defaultHotbarGroup({})).toBe('terrain');
    expect(defaultHotbarGroup({ rose_planter: 1 })).toBe('nature');
    expect(defaultHotbarGroup({ firepot: 1 })).toBe('decor');
    expect(defaultHotbarGroup({ cottage: 1 })).toBe('buildings');
  });
});
