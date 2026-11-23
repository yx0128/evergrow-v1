import { HOTBAR_ORDER, ITEM_MAP } from '../data/items';
import type { HotbarGroup, HotbarView, ItemDef } from '../types';

export const HOTBAR_GROUPS: Array<{ id: HotbarGroup; label: string }> = [
  { id: 'terrain', label: 'Terrain' },
  { id: 'buildings', label: 'Buildings' },
  { id: 'nature', label: 'Nature' },
  { id: 'decor', label: 'Decor' },
];

export const HOTBAR_ITEMS: ItemDef[] = HOTBAR_ORDER.flatMap((id) => {
  const item = ITEM_MAP[id];
  return item ? [item] : [];
});

export const HOTBAR_VIEWS: Array<{ id: HotbarView; label: string }> = [
  { id: 'all', label: 'All' },
  ...HOTBAR_GROUPS,
];

const CATEGORY_ORDER = new Map<string, number>(
  HOTBAR_GROUPS.map((group, index) => [group.id, index]),
);
const ITEM_ORDER = new Map<string, number>(
  HOTBAR_ORDER.map((id, index) => [id, index]),
);

export function getHotbarItems(group: HotbarGroup): ItemDef[] {
  return HOTBAR_ITEMS.filter((item) => item.hotbarGroup === group);
}

function ownedFirst(item: ItemDef, inventory: Record<string, number>): number {
  return (inventory[item.id] ?? 0) > 0 ? 0 : 1;
}

export function getHotbarViewItems(
  view: HotbarView,
  inventory: Record<string, number>,
): ItemDef[] {
  const items = view === 'all' ? [...HOTBAR_ITEMS] : getHotbarItems(view);
  return items.sort((a, b) => {
    const ownedDiff = ownedFirst(a, inventory) - ownedFirst(b, inventory);
    if (ownedDiff !== 0) return ownedDiff;
    const categoryDiff =
      (CATEGORY_ORDER.get(a.hotbarGroup) ?? 0) -
      (CATEGORY_ORDER.get(b.hotbarGroup) ?? 0);
    if (categoryDiff !== 0) return categoryDiff;
    return (ITEM_ORDER.get(a.id) ?? 0) - (ITEM_ORDER.get(b.id) ?? 0);
  });
}

export function hotbarGroupForItem(itemId: string): HotbarGroup {
  return ITEM_MAP[itemId]?.hotbarGroup ?? 'terrain';
}

export function ownedInGroup(
  group: HotbarGroup,
  inventory: Record<string, number>,
): number {
  return getHotbarItems(group).filter((item) => (inventory[item.id] ?? 0) > 0)
    .length;
}

export function defaultHotbarGroup(
  inventory: Record<string, number>,
): HotbarGroup {
  return (
    HOTBAR_GROUPS.find((group) =>
      getHotbarItems(group.id).some((item) => (inventory[item.id] ?? 0) > 0),
    )?.id ?? HOTBAR_GROUPS[0].id
  );
}
