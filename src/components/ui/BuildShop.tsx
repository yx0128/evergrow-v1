import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, ShoppingBag, X } from 'lucide-react';
import {
  BASE_ITEMS,
  ITEM_MAP,
  ITEMS,
  PROP_ITEMS,
} from '../../data/items';
import { playSound } from '../../lib/sound';
import { useWorldStore } from '../../store/useWorldStore';
import type { ItemCategory } from '../../types';
import type { ToastTone } from '../../types-ui';
import { ItemGlyph } from './ItemGlyph';

interface BuildShopProps {
  open: boolean;
  focusItemId?: string | null;
  onClose: () => void;
  onPurchased?: (itemId: string) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export function BuildShop({
  open,
  focusItemId,
  onClose,
  onPurchased,
  onToast,
}: BuildShopProps) {
  const coins = useWorldStore((state) => state.coins);
  const inventory = useWorldStore((state) => state.inventory);
  const buyItem = useWorldStore((state) => state.buyItem);
  const [tab, setTab] = useState<ItemCategory>('base');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const items = useMemo(
    () => (tab === 'base' ? BASE_ITEMS : PROP_ITEMS),
    [tab],
  );

  useEffect(() => {
    if (!open) {
      setHighlightId(null);
      return;
    }
    if (!focusItemId) return;
    const item = ITEM_MAP[focusItemId];
    if (!item) return;
    if (item.category !== tab) {
      setTab(item.category);
      return;
    }
    const element = document.getElementById(`shop-item-${focusItemId}`);
    element?.scrollIntoView({ block: 'nearest' });
    setHighlightId(focusItemId);
    const timer = window.setTimeout(() => setHighlightId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [open, focusItemId, tab]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function handleBuy(itemId: string) {
    const result = buyItem(itemId);
    if (result.ok) {
      playSound('buy');
      onToast(result.message, 'success');
      onPurchased?.(itemId);
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  const ownedTotal = ITEMS.reduce((sum, item) => sum + (inventory[item.id] ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Close build shop"
      />
      <div
        ref={panelRef}
        className="glass-panel relative flex max-h-[86vh] w-full max-w-3xl animate-panel-in flex-col overflow-hidden rounded-[30px] shadow-panel"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 pb-3 pt-5 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-deep">
              Build Shop
            </p>
            <h2
              id="shop-title"
              className="pt-0.5 font-display text-[24px] leading-tight text-ink"
            >
              Grow the floating garden
            </h2>
            <p className="pt-1 text-[11.5px] text-ink-soft/75">
              {ownedTotal} pieces in inventory · every item fits one 1×1 cell.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-[13px] font-semibold text-gold-deep">
              <Coins size={14} />
              {coins.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hud-button focus-ring !h-9 !w-9 !p-0"
              aria-label="Close build shop"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="flex gap-1.5 px-5 pt-3 sm:px-6">
          {(
            [
              ['base', 'Base Tiles', BASE_ITEMS.length],
              ['prop', 'Surface Props', PROP_ITEMS.length],
            ] as const
          ).map(([value, label, count]) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  playSound('ui');
                }}
                className={`focus-ring flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition ${
                  active
                    ? 'bg-sage-deep text-ivory shadow-float'
                    : 'bg-white/45 text-ink-soft/80 hover:bg-white/70'
                }`}
                aria-pressed={active}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[9.5px] font-bold ${
                    active ? 'bg-ivory/20' : 'bg-ink/10'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {items.map((item) => {
              const owned = inventory[item.id] ?? 0;
              const affordable = coins >= item.cost;
              return (
                <li
                  key={item.id}
                  id={`shop-item-${item.id}`}
                  className={`group flex flex-col rounded-2xl border border-ink/10 bg-white/45 p-3 transition hover:border-sage/40 hover:bg-white/65 ${
                    highlightId === item.id
                      ? 'ring-2 ring-sage-deep/45 bg-white/70'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 shadow-inner-soft"
                      style={{ backgroundColor: `${item.accent}26` }}
                    >
                      <ItemGlyph item={item} size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-display text-[14.5px] leading-tight text-ink">
                          {item.name}
                        </h3>
                        {owned > 0 ? (
                          <span className="shrink-0 rounded-full bg-sage/20 px-1.5 py-0.5 text-[9px] font-bold text-sage-deep">
                            ×{owned}
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 pt-0.5 text-[10.5px] leading-snug text-ink-soft/65">
                        {item.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-gold-deep">
                      <Coins size={12} />
                      {item.cost}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBuy(item.id)}
                      disabled={!affordable}
                      aria-label={
                        affordable
                          ? `Buy ${item.name} for ${item.cost} coins`
                          : `${item.name} costs ${item.cost} coins; need ${item.cost - coins} more`
                      }
                      className={`focus-ring rounded-full px-3 py-1.5 text-[10.5px] font-bold transition ${
                        affordable
                          ? 'bg-terracotta/15 text-terracotta-deep hover:bg-terracotta hover:text-ivory active:scale-95'
                          : 'cursor-not-allowed bg-ink/5 text-ink-soft/40'
                      }`}
                      title={
                        affordable
                          ? `Buy ${item.name} for ${item.cost} coins`
                          : `Need ${item.cost - coins} more coins`
                      }
                    >
                      {affordable ? 'Buy' : `Need ${item.cost - coins}`}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-ink/10 px-5 py-3 text-[10.5px] text-ink-soft/60 sm:px-6">
          <span className="flex items-center gap-1.5">
            <ShoppingBag size={12} className="text-sage-deep" />
            Purchases go to your hotbar. Select, then click the grid.
          </span>
          <span className="hidden sm:inline">B opens shop · Esc closes</span>
        </footer>
      </div>
    </div>
  );
}
