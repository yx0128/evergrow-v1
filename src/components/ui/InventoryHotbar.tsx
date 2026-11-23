import {
  Archive,
  ChevronDown,
  Coins,
  Move,
  RotateCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { HotbarView, ItemDef } from '../../types';
import { playSound } from '../../lib/sound';
import {
  HOTBAR_ITEMS,
  HOTBAR_VIEWS,
  getHotbarViewItems,
} from '../../lib/hotbar';
import { ItemGlyph } from './ItemGlyph';

interface InventoryHotbarProps {
  view: HotbarView;
  inventory: Record<string, number>;
  selectedId: string | null;
  selectedPiece: ItemDef | null;
  movingItem: ItemDef | null;
  rotation: number;
  storeMode: boolean;
  moveMode: boolean;
  onSelect: (itemId: string) => void;
  onOpenShopForItem: (itemId: string) => void;
  onViewChange: (view: HotbarView) => void;
  onRotate: () => void;
  onToggleStoreMode: () => void;
  onToggleMoveMode: () => void;
  onSellSelectedPiece: () => void;
  onDeselect: () => void;
  onCancelMove: () => void;
  onOpenShop: () => void;
}

const CATEGORY_LABEL: Record<ItemDef['category'], string> = {
  base: 'base tile',
  prop: 'surface prop',
};

const CATEGORY_BG: Record<ItemDef['hotbarGroup'], string> = {
  terrain: 'bg-sand/[0.20] hover:bg-sand/[0.32]',
  buildings: 'bg-gold/[0.20] hover:bg-gold/[0.30]',
  nature: 'bg-sage/[0.16] hover:bg-sage/[0.28]',
  decor: 'bg-sky/[0.18] hover:bg-sky/[0.28]',
};

export function InventoryHotbar({
  view,
  inventory,
  selectedId,
  selectedPiece,
  movingItem,
  rotation,
  storeMode,
  moveMode,
  onSelect,
  onOpenShopForItem,
  onViewChange,
  onRotate,
  onToggleStoreMode,
  onToggleMoveMode,
  onSellSelectedPiece,
  onDeselect,
  onCancelMove,
  onOpenShop,
}: InventoryHotbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const items = getHotbarViewItems(view, inventory);
  const selected = selectedId
    ? HOTBAR_ITEMS.find((item) => item.id === selectedId)
    : undefined;

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
          <button
            type="button"
            onClick={onSellSelectedPiece}
            className="focus-ring flex items-center gap-0.5 rounded-full bg-sage/20 px-1.5 py-0.5 text-[9.5px] font-bold text-sage-deep transition hover:bg-sage/35"
            aria-label={`Sell ${selectedPiece.name} for a full refund`}
            title="Sell for a full refund"
          >
            <Coins size={10} />
            Sell
          </button>
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
      ) : moveMode ? (
        <div className="glass-pill rounded-full px-3 py-1.5 text-[10.5px] font-medium text-gold-deep shadow-float">
          Move mode · click a placed piece · Move or Esc to exit
        </div>
      ) : storeMode ? (
        <div className="glass-pill rounded-full px-3 py-1.5 text-[10.5px] font-medium text-terracotta-deep shadow-float">
          Store mode · click a piece to return it to inventory · Esc to exit
        </div>
      ) : null}

      <div
        data-testid="hotbar-dock"
        className={`glass-panel pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-[24px] px-5 py-3 shadow-panel ${
          collapsed
            ? 'w-auto'
            : 'w-[560px] min-[1366px]:w-[700px]'
        }`}
      >
        <div className={`flex items-center gap-3 ${collapsed ? '' : 'justify-between px-0.5'}`}>
          {collapsed ? null : (
            <div className="flex min-w-0 items-center gap-1.5">
              <div
                className="hide-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto"
                role="group"
                aria-label="Hotbar category"
              >
                {HOTBAR_VIEWS.map((entry) => {
                  const active = view === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onViewChange(entry.id)}
                      className={`focus-ring shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                        active
                          ? 'bg-sage-deep text-ivory shadow-float'
                          : 'bg-white/45 text-ink-soft/80 hover:bg-white/70'
                      }`}
                      aria-pressed={active}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onRotate();
                playSound('ui');
              }}
              className="group hud-button focus-ring !h-8 !rounded-xl !border !border-transparent !px-2 !text-[10px] hover:!border-gold/30 hover:!bg-gold/15 hover:!text-gold-deep"
              aria-label="Rotate selection, placement, or lifted piece 90 degrees"
            >
              <RotateCw size={13} />
              <span className={collapsed ? 'hidden' : 'max-[1365px]:hidden'}>Rotate</span>
              <span className="rounded bg-ink/8 px-1 font-mono text-[8px] text-ink-soft transition group-hover:bg-gold/20 group-hover:text-gold-deep">
                {rotation * 90}°
              </span>
            </button>
            <button
              type="button"
              onClick={onToggleMoveMode}
              className={`hud-button focus-ring !h-8 !rounded-xl !border !px-2 !text-[10px] ${
                moveMode
                  ? '!border-gold/40 !bg-gold/20 !text-gold-deep ring-1 ring-gold/30'
                  : '!border-transparent hover:!border-gold/30 hover:!bg-gold/15 hover:!text-gold-deep'
              }`}
              aria-pressed={moveMode}
              aria-label="Toggle move mode"
            >
              <Move size={13} />
              <span className={collapsed ? 'hidden' : 'max-[1365px]:hidden'}>Move</span>
            </button>
            <button
              type="button"
              onClick={onToggleStoreMode}
              className={`hud-button focus-ring !h-8 !rounded-xl !border !px-2 !text-[10px] ${
                storeMode
                  ? '!border-gold/40 !bg-gold/20 !text-gold-deep ring-1 ring-gold/30'
                  : '!border-transparent hover:!border-gold/30 hover:!bg-gold/15 hover:!text-gold-deep'
              }`}
              aria-pressed={selectedPiece ? undefined : storeMode}
              aria-label={
                selectedPiece
                  ? `Store ${selectedPiece.name}`
                  : 'Toggle store mode'
              }
            >
              <Archive size={13} />
              <span className={collapsed ? 'hidden' : 'max-[1365px]:hidden'}>Store</span>
            </button>
            <span className="mx-0.5 h-4 w-px bg-ink/10" aria-hidden />
            <button
              type="button"
              onClick={onOpenShop}
              className="focus-ring flex h-8 items-center gap-1.5 rounded-xl border border-terracotta/25 bg-terracotta/10 px-2 text-[10px] font-bold text-terracotta-deep transition hover:bg-terracotta/20 active:scale-95"
              aria-haspopup="dialog"
            >
              <ShoppingBag size={13} />
              <span className={collapsed ? 'hidden' : 'max-[1365px]:hidden'}>Shop</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="focus-ring flex h-8 w-6 items-center justify-center rounded-lg text-ink-soft/60 transition hover:bg-white/60 hover:text-ink"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand hotbar' : 'Collapse hotbar'}
              title={collapsed ? 'Expand hotbar' : 'Collapse hotbar'}
            >
              <ChevronDown
                size={13}
                className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {collapsed ? null : (
        <div
          className="hide-scrollbar flex w-full items-end justify-start gap-2.5 overflow-x-auto pb-1 pt-2.5 max-[1365px]:gap-2"
          role="toolbar"
          aria-label="Inventory hotbar"
        >
          {items.map((item) => {
            const owned = inventory[item.id] ?? 0;
            const active = selectedId === item.id;
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
                    ? `-translate-y-1 border-sage-deep/70 shadow-float ring-1 ring-sage-deep/25 ${CATEGORY_BG[item.hotbarGroup]}`
                    : owned > 0
                      ? `border-white/70 hover:-translate-y-0.5 hover:border-sage/40 ${CATEGORY_BG[item.hotbarGroup]}`
                      : 'border-dashed border-ink/20 bg-ink/[0.035] hover:-translate-y-0.5 hover:border-terracotta/35 hover:bg-white/45'
                }`}
                aria-label={`${item.name}, ${owned} owned, ${CATEGORY_LABEL[item.category]}${
                  owned > 0 ? '' : ', opens build shop'
                }`}
                aria-pressed={active}
              >
                <ItemGlyph
                  item={item}
                  size={21}
                  vibrant={owned > 0}
                  className={owned > 0 ? undefined : 'opacity-35 grayscale'}
                />
                <span
                  className={`max-w-[48px] truncate px-0.5 pt-0.5 text-[9.5px] font-semibold leading-none ${
                    owned > 0 ? 'text-ink-soft' : 'text-ink-soft/55'
                  }`}
                >
                  {item.shortName}
                </span>
                {owned > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[8.5px] font-bold text-ivory">
                    {owned}
                  </span>
                ) : (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-ink opacity-100"
                    aria-hidden
                  >
                    +
                  </span>
                )}
              </button>
            );
          })}
        </div>
        )}
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
