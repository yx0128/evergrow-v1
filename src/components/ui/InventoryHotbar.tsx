import { Archive, Move, RotateCw, ShoppingBag, X } from 'lucide-react';
import type { ItemDef } from '../../types';
import { playSound } from '../../lib/sound';
import { ItemGlyph } from './ItemGlyph';

interface InventoryHotbarProps {
  items: ItemDef[];
  inventory: Record<string, number>;
  selectedId: string | null;
  selectedItem: ItemDef | null;
  movingItem: ItemDef | null;
  rotation: number;
  storeMode: boolean;
  onSelect: (itemId: string) => void;
  onRotate: () => void;
  onToggleStoreMode: () => void;
  onMoveSelected: () => void;
  onDeselect: () => void;
  onCancelMove: () => void;
  onOpenShop: () => void;
}

export function InventoryHotbar({
  items,
  inventory,
  selectedId,
  selectedItem,
  movingItem,
  rotation,
  storeMode,
  onSelect,
  onRotate,
  onToggleStoreMode,
  onMoveSelected,
  onDeselect,
  onCancelMove,
  onOpenShop,
}: InventoryHotbarProps) {
  const selected = items.find((item) => item.id === selectedId);

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
      {movingItem ? (
        <div className="glass-pill pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-medium text-ink shadow-float">
          <ItemGlyph item={movingItem} size={13} />
          <span>
            Moving <strong className="font-semibold">{movingItem.name}</strong>
          </span>
          <span className="text-ink-soft/50">·</span>
          <span className="text-ink-soft/70">Click a valid cell to drop it</span>
          <span className="text-ink-soft/50">·</span>
          <span className="rounded bg-ink/8 px-1 py-0.5 font-mono text-[9px] text-ink-soft/70">
            R
          </span>
          <span className="text-ink-soft/70">rotate</span>
          <span className="rounded bg-ink/8 px-1 py-0.5 font-mono text-[9px] text-ink-soft/70">
            Esc
          </span>
          <button
            type="button"
            onClick={onCancelMove}
            className="focus-ring rounded-full p-0.5 text-ink-soft/60 transition hover:text-ink"
            aria-label="Cancel moving item"
          >
            <X size={12} />
          </button>
        </div>
      ) : selectedItem ? (
        <div className="glass-pill pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-medium text-ink shadow-float">
          <ItemGlyph item={selectedItem} size={13} />
          <span>
            Selected <strong className="font-semibold">{selectedItem.name}</strong>
          </span>
          <span className="text-ink-soft/50">·</span>
          <span className="rounded bg-ink/8 px-1 py-0.5 font-mono text-[9px] text-ink-soft/70">
            R
          </span>
          <span className="text-ink-soft/70">rotate</span>
          <span className="text-ink-soft/50">·</span>
          <span className="text-ink-soft/70">Right-click stores</span>
          <button
            type="button"
            onClick={onMoveSelected}
            className="focus-ring flex items-center gap-1 rounded-full bg-white/50 px-2 py-0.5 text-[9.5px] font-semibold text-ink-soft transition hover:bg-white/80"
            aria-label="Move selected piece"
            title="Move selected piece (M)"
          >
            <Move size={11} />
            Move
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
        <div className="glass-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] font-medium text-ink shadow-float">
          <ItemGlyph item={selected} size={13} />
          <span>
            Placing <strong className="font-semibold">{selected.name}</strong>
          </span>
          <span className="text-ink-soft/50">·</span>
          <span className="text-ink-soft/70">Click grid to place</span>
          <span className="rounded bg-ink/8 px-1 py-0.5 font-mono text-[9px] text-ink-soft/70">
            R
          </span>
          <span className="text-ink-soft/70">rotate</span>
        </div>
      ) : storeMode ? (
        <div className="glass-pill rounded-full px-3 py-1.5 text-[10.5px] font-medium text-terracotta-deep shadow-float">
          Store mode · click a piece to return it to inventory
        </div>
      ) : null}

      <div className="glass-panel pointer-events-auto flex items-center gap-2 rounded-[24px] p-2 shadow-panel">
        <div className="flex items-end gap-1.5">
          {Array.from({ length: 9 }).map((_, index) => {
            const item = items[index];
            if (!item) {
              return (
                <div
                  key={`empty-${index}`}
                  className="flex h-[54px] w-[54px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/20 text-[8.5px] text-ink-soft/35"
                  title="Buy items in the shop to fill this slot"
                >
                  <span className="font-mono text-[9px] opacity-60">{index + 1}</span>
                </div>
              );
            }
            const active = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  playSound('ui');
                }}
                className={`group relative flex h-[54px] w-[54px] flex-col items-center justify-center rounded-2xl border transition ${
                  active
                    ? '-translate-y-1 border-sage-deep/60 bg-sage/25 shadow-float'
                    : 'border-white/70 bg-white/45 hover:-translate-y-0.5 hover:border-sage/40 hover:bg-white/70'
                }`}
                title={`${item.name} · ${inventory[item.id] ?? 0} owned`}
                aria-label={`Select ${item.name}, ${inventory[item.id] ?? 0} owned`}
                aria-pressed={active}
              >
                <span className="absolute left-1 top-0.5 font-mono text-[8.5px] font-semibold text-ink-soft/45">
                  {index + 1}
                </span>
                <ItemGlyph item={item} size={21} />
                <span className="pt-0.5 text-[8.5px] font-semibold leading-none text-ink-soft/70">
                  {item.name.split(' ')[0]}
                </span>
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[8.5px] font-bold text-ivory">
                  {inventory[item.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <span className="mx-0.5 h-10 w-px bg-ink/10" aria-hidden />

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              onRotate();
              playSound('ui');
            }}
            className="hud-button focus-ring !justify-start !rounded-xl !px-2 !py-1.5"
            title="Rotate selection, placement, or lifted piece 90° (R)"
            aria-label="Rotate selection, placement, or lifted piece 90 degrees"
          >
            <RotateCw size={13} />
            <span className="text-[9.5px]">Rotate</span>
            <span className="rounded bg-ink/8 px-1 font-mono text-[8px] text-ink-soft/60">
              {rotation * 90}°
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleStoreMode}
            data-active={storeMode}
            className="hud-button focus-ring !justify-start !rounded-xl !px-2 !py-1.5"
            title="Store the selected piece, or toggle store mode when nothing is selected"
            aria-pressed={storeMode}
          >
            <Archive size={13} />
            <span className="text-[9.5px]">Store</span>
          </button>
          <button
            type="button"
            onClick={onOpenShop}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-sage-deep px-2.5 py-1.5 text-[9.5px] font-bold text-ivory shadow-float transition hover:bg-moss active:scale-95"
            title="Open build shop (B)"
          >
            <ShoppingBag size={13} />
            Shop
            <span className="rounded bg-ivory/20 px-1 font-mono text-[8px]">B</span>
          </button>
        </div>
      </div>
    </div>
  );
}
