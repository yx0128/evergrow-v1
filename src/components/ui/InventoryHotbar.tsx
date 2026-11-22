import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Move,
  RotateCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ItemDef } from '../../types';
import { playSound } from '../../lib/sound';
import {
  HOTBAR_ITEMS,
  getHotbarSlots,
  ownedOnHotbarPage,
} from '../../lib/hotbar';
import { ItemGlyph } from './ItemGlyph';

interface InventoryHotbarProps {
  page: number;
  pageCount: number;
  inventory: Record<string, number>;
  selectedId: string | null;
  selectedPiece: ItemDef | null;
  movingItem: ItemDef | null;
  rotation: number;
  storeMode: boolean;
  onSelect: (itemId: string) => void;
  onOpenShopForItem: (itemId: string) => void;
  onPageChange: (page: number) => void;
  onRotate: () => void;
  onToggleStoreMode: () => void;
  onMoveSelected: () => void;
  onDeselect: () => void;
  onCancelMove: () => void;
  onOpenShop: () => void;
}

const CATEGORY_LABEL: Record<ItemDef['category'], string> = {
  base: 'base tile',
  prop: 'surface prop',
};

export function InventoryHotbar({
  page,
  pageCount,
  inventory,
  selectedId,
  selectedPiece,
  movingItem,
  rotation,
  storeMode,
  onSelect,
  onOpenShopForItem,
  onPageChange,
  onRotate,
  onToggleStoreMode,
  onMoveSelected,
  onDeselect,
  onCancelMove,
  onOpenShop,
}: InventoryHotbarProps) {
  const slots = getHotbarSlots(page);
  const selected = selectedId
    ? HOTBAR_ITEMS.find((item) => item.id === selectedId)
    : undefined;
  const ownedOnPage = ownedOnHotbarPage(page, inventory);
  const canMove = Boolean(selectedPiece) && !movingItem;

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2">
      {movingItem ? (
        <div className="glass-pill pointer-events-auto flex max-w-[min(92vw,620px)] flex-wrap items-center justify-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-medium text-ink shadow-float">
          <ItemGlyph item={movingItem} size={13} />
          <span>
            Moving <strong className="font-semibold">{movingItem.name}</strong>
          </span>
          <span className="text-ink-soft/50">·</span>
          <span className="text-ink-soft">Click a valid cell to drop it</span>
          <span className="text-ink-soft/50">·</span>
          <Keycap>R</Keycap>
          <span className="text-ink-soft">rotate</span>
          <Keycap>Esc</Keycap>
          <button
            type="button"
            onClick={onCancelMove}
            className="focus-ring rounded-full p-0.5 text-ink-soft/60 transition hover:text-ink"
            aria-label="Cancel moving item"
          >
            <X size={12} />
          </button>
        </div>
      ) : selectedPiece ? (
        <div className="glass-pill pointer-events-auto flex max-w-[min(92vw,560px)] flex-wrap items-center justify-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-medium text-ink shadow-float">
          <ItemGlyph item={selectedPiece} size={13} />
          <span>
            Selected{' '}
            <strong className="font-semibold">{selectedPiece.name}</strong>
          </span>
          <span className="text-ink-soft/50">·</span>
          <Keycap>R</Keycap>
          <span className="text-ink-soft">rotate</span>
          <span className="text-ink-soft/50">·</span>
          <span className="text-ink-soft">Right-click stores</span>
          <button
            type="button"
            onClick={onDeselect}
            className="focus-ring rounded-full p-0.5 text-ink-soft/60 transition hover:text-ink"
            aria-label="Deselect piece"
          >
            <X size={12} />
          </button>
        </div>
      ) : selected ? (
        <div className="glass-pill pointer-events-auto flex max-w-[min(92vw,560px)] flex-wrap items-center justify-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-medium text-ink shadow-float">
          <ItemGlyph item={selected} size={13} />
          <span>
            Placing <strong className="font-semibold">{selected.name}</strong>
          </span>
          <span className="text-ink-soft/50">·</span>
          <span className="text-ink-soft">
            {selected.category === 'base'
              ? 'Click an empty cell'
              : 'Click a base tile'}
          </span>
          <span className="text-ink-soft/50">·</span>
          <Keycap>R</Keycap>
          <span className="text-ink-soft">rotate</span>
        </div>
      ) : storeMode ? (
        <div className="glass-pill rounded-full px-3 py-1.5 text-[10.5px] font-medium text-terracotta-deep shadow-float">
          Store mode · click a piece to return it to inventory
        </div>
      ) : null}

      <div
        data-testid="hotbar-dock"
        className="glass-panel pointer-events-auto flex flex-col gap-1.5 rounded-[24px] p-2 shadow-panel"
      >
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0}
              className="focus-ring rounded-full p-1 text-ink-soft/60 transition hover:bg-white/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous hotbar page"
              title="Previous page ([)"
            >
              <ChevronLeft size={14} />
            </button>
            <span
              className="min-w-[62px] text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-soft"
              aria-live="polite"
            >
              Page {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount - 1}
              className="focus-ring rounded-full p-1 text-ink-soft/60 transition hover:bg-white/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next hotbar page"
              title="Next page (])"
            >
              <ChevronRight size={14} />
            </button>
            <span className="ml-1 hidden text-[8.5px] font-medium text-ink-soft/80 min-[1366px]:inline">
              {ownedOnPage} owned
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onRotate();
                playSound('ui');
              }}
              className="hud-button focus-ring !h-8 !rounded-xl !px-2 !text-[10px]"
              title="Rotate selection, placement, or lifted piece 90° (R)"
              aria-label="Rotate selection, placement, or lifted piece 90 degrees"
            >
              <RotateCw size={13} />
              <span className="max-[1365px]:hidden">Rotate</span>
              <span className="rounded bg-ink/8 px-1 font-mono text-[8px] text-ink-soft">
                {rotation * 90}°
              </span>
            </button>
            <button
              type="button"
              onClick={onMoveSelected}
              disabled={!canMove}
              className="hud-button focus-ring !h-8 !rounded-xl !px-2 !text-[10px]"
              title={
                selectedPiece
                  ? 'Move selected piece (M)'
                  : 'Select a placed piece to move it'
              }
              aria-label="Move selected piece"
            >
              <Move size={13} />
              <span className="max-[1365px]:hidden">Move</span>
            </button>
            <button
              type="button"
              onClick={onToggleStoreMode}
              className={`hud-button focus-ring !h-8 !rounded-xl !px-2 !text-[10px] ${
                storeMode
                  ? '!bg-terracotta/15 !text-terracotta-deep ring-1 ring-terracotta/30'
                  : ''
              }`}
              aria-pressed={selectedPiece ? undefined : storeMode}
              aria-label={
                selectedPiece
                  ? `Store ${selectedPiece.name}`
                  : 'Toggle store mode'
              }
              title={
                selectedPiece
                  ? `Store ${selectedPiece.name} to inventory`
                  : 'Click a piece to store it in inventory'
              }
            >
              <Archive size={13} />
              <span className="max-[1365px]:hidden">Store</span>
            </button>
            <span className="mx-0.5 h-4 w-px bg-ink/10" aria-hidden />
            <button
              type="button"
              onClick={onOpenShop}
              className="focus-ring flex h-8 items-center gap-1.5 rounded-xl border border-terracotta/25 bg-terracotta/10 px-2 text-[10px] font-bold text-terracotta-deep transition hover:bg-terracotta/20 active:scale-95"
              title="Open build shop (B)"
              aria-haspopup="dialog"
            >
              <ShoppingBag size={13} />
              <span className="max-[1365px]:hidden">Shop</span>
              <span className="rounded bg-ivory/70 px-1 font-mono text-[8px] text-terracotta-deep">
                B
              </span>
            </button>
          </div>
        </div>

        <div
          className="flex items-end justify-center gap-1.5 max-[1365px]:gap-1"
          role="toolbar"
          aria-label="Inventory hotbar"
        >
          {slots.map(({ item, slot }) => {
            const owned = inventory[item.id] ?? 0;
            const active = selectedId === item.id;
            const isBase = item.category === 'base';
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`hotbar-slot-${item.id}`}
                onClick={() => {
                  if (owned > 0) {
                    onSelect(item.id);
                    playSound('ui');
                    return;
                  }
                  onOpenShopForItem(item.id);
                }}
                className={`group relative flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-2xl border transition max-[1365px]:h-12 max-[1365px]:w-12 ${
                  active
                    ? '-translate-y-1 border-sage-deep/60 bg-sage/25 shadow-float'
                    : owned > 0
                      ? 'border-white/70 bg-white/45 hover:-translate-y-0.5 hover:border-sage/40 hover:bg-white/70'
                      : 'border-dashed border-ink/15 bg-white/20 hover:-translate-y-0.5 hover:border-terracotta/35 hover:bg-white/45'
                }`}
                title={`${item.name} · ${owned} owned · ${CATEGORY_LABEL[item.category]}${
                  owned > 0 ? '' : ' · click to open the shop'
                }`}
                aria-label={`${item.name}, ${owned} owned, ${CATEGORY_LABEL[item.category]}${
                  owned > 0 ? '' : ', opens build shop'
                }`}
                aria-pressed={active}
              >
                <span className="absolute left-1 top-0.5 font-mono text-[8.5px] font-semibold text-ink-soft">
                  {slot}
                </span>
                <span
                  className={`absolute inset-x-0 bottom-0 h-[3px] rounded-b-2xl ${
                    isBase ? 'bg-sage/60' : 'text-terracotta/60'
                  }`}
                  style={
                    isBase
                      ? undefined
                      : {
                          backgroundImage:
                            'repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)',
                        }
                  }
                  aria-hidden
                />
                <ItemGlyph
                  item={item}
                  size={21}
                  className={owned > 0 ? undefined : 'opacity-45'}
                />
                <span className="max-w-[48px] truncate px-0.5 pt-0.5 text-[9px] font-semibold leading-none text-ink-soft">
                  {item.shortName}
                </span>
                {owned > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[8.5px] font-bold text-ivory">
                    {owned}
                  </span>
                ) : (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold/25 text-[10px] font-bold text-gold-deep"
                    aria-hidden
                  >
                    +
                  </span>
                )}
              </button>
            );
          })}
          {slots.length < 9
            ? Array.from({ length: 9 - slots.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="h-[54px] w-[54px] shrink-0 rounded-2xl border border-dashed border-ink/10 bg-white/20 max-[1365px]:h-12 max-[1365px]:w-12"
                  aria-hidden
                />
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

function Keycap({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-ink/8 px-1 py-0.5 font-mono text-[9px] text-ink-soft">
      {children}
    </span>
  );
}
