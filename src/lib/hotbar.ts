import { HOTBAR_ORDER, HOTBAR_PAGE_SIZE, ITEM_MAP } from '../data/items';
import type { ItemDef } from '../types';

export const HOTBAR_ITEMS: ItemDef[] = HOTBAR_ORDER.flatMap((id) => {
  const item = ITEM_MAP[id];
  return item ? [item] : [];
});

export const HOTBAR_PAGE_COUNT = Math.max(
  1,
  Math.ceil(HOTBAR_ITEMS.length / HOTBAR_PAGE_SIZE),
);

export function clampHotbarPage(page: number): number {
  if (!Number.isFinite(page)) return 0;
  return Math.max(
    0,
    Math.min(HOTBAR_PAGE_COUNT - 1, Math.floor(page)),
  );
}

export function getHotbarSlots(page: number): Array<{ item: ItemDef; slot: number }> {
  const start = clampHotbarPage(page) * HOTBAR_PAGE_SIZE;
  return HOTBAR_ITEMS.slice(start, start + HOTBAR_PAGE_SIZE).map((item, index) => ({
    item,
    slot: index + 1,
  }));
}

export function hotbarPageForItem(itemId: string): number {
  const index = HOTBAR_ORDER.indexOf(itemId);
  return index === -1 ? 0 : Math.floor(index / HOTBAR_PAGE_SIZE);
}

export function ownedOnHotbarPage(
  page: number,
  inventory: Record<string, number>,
): number {
  return getHotbarSlots(page).filter(({ item }) => (inventory[item.id] ?? 0) > 0)
    .length;
}
