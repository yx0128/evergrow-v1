import { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { ITEM_MAP } from '../../data/items';
import { HOTBAR_GROUPS, getHotbarItems } from '../../lib/hotbar';
import { playSound } from '../../lib/sound';
import { useWorldStore } from '../../store/useWorldStore';
import type { HotbarGroup } from '../../types';
import type { ToastTone } from '../../types-ui';
import { CoinIcon } from './CoinIcon';

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
  const sellItem = useWorldStore((state) => state.sellItem);
  const [tab, setTab] = useState<HotbarGroup>('terrain');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const items = useMemo(() => getHotbarItems(tab), [tab]);

  useEffect(() => {
    if (!open) {
      setHighlightId(null);
      return;
    }
    if (!focusItemId) return;
    const item = ITEM_MAP[focusItemId];
    if (!item) return;
    if (item.hotbarGroup !== tab) {
      setTab(item.hotbarGroup);
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

  function handleSell(itemId: string) {
    const result = sellItem(itemId);
    playSound(result.ok ? 'store' : 'error');
    onToast(result.message, result.ok ? 'success' : 'error');
  }

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
        className="glass-panel relative flex h-[88vh] max-h-[640px] w-full max-w-3xl animate-panel-in flex-col overflow-hidden rounded-[30px] shadow-panel"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-sage-deep">
              Build Shop
            </p>
            <h2
              id="shop-title"
              className="mt-1 font-display text-[22px] leading-tight text-ink"
            >
              Grow your world
            </h2>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
              Buy tiles and props with coins you earn from finished tasks.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1.5 text-[13.5px] font-semibold text-gold-ink ring-1 ring-gold/30">
              <CoinIcon size={14} />
              {coins.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hud-icon focus-ring !h-9 !w-9"
              aria-label="Close build shop"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto px-6 pt-3">
          {HOTBAR_GROUPS.map(({ id, label }) => {
            const active = tab === id;
            const count = getHotbarItems(id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  playSound('ui');
                }}
                className={`focus-ring flex min-w-[104px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                  active
                    ? 'bg-sage-deep text-ivory shadow-float'
                    : 'bg-white/55 text-ink-soft hover:bg-white/80 hover:text-ink'
                }`}
                aria-pressed={active}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    active ? 'bg-ivory/25 text-ivory' : 'bg-ink/10 text-ink-soft'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="panel-scroll mt-3 min-h-0 flex-1 overflow-y-auto px-6 pb-5">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const owned = inventory[item.id] ?? 0;
              const affordable = coins >= item.cost;
              return (
                <li
                  key={item.id}
                  id={`shop-item-${item.id}`}
                  className={`group flex flex-col rounded-3xl border border-ink/10 bg-white/55 p-3.5 transition hover:-translate-y-0.5 hover:border-sage/45 hover:bg-white/80 hover:shadow-float ${
                    highlightId === item.id
                      ? 'ring-2 ring-sage-deep/45 bg-white/80'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 shadow-inner-soft"
                      style={{ backgroundColor: `${item.accent}26` }}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}items/${item.id}.png`}
                        alt={item.name}
                        className={`h-full w-full object-contain ${item.id === 'paper_lantern' ? 'scale-75' : ''}`}
                        loading="lazy"
                        draggable={false}
                      />
                      {owned > 0 ? (
                        <span className="absolute right-1 top-1 rounded-full bg-sage-deep px-1.5 py-0.5 text-[9.5px] font-bold text-ivory shadow-float">
                          {owned}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-[15px] leading-tight text-ink">
                        {item.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-soft">
                        {item.blurb}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          owned > 0
                            ? 'bg-sage/20 text-sage-deep'
                            : 'bg-ink/5 text-ink-soft/80'
                        }`}
                      >
                        {owned > 0 ? `${owned} in inventory` : 'Not owned yet'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-[12px] font-bold text-gold-deep">
                      <CoinIcon size={12} />
                      {item.cost}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {owned > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSell(item.id)}
                          className="focus-ring rounded-full bg-sage/15 px-3 py-1.5 text-[11px] font-bold text-sage-deep transition hover:bg-sage/30 active:scale-95"
                          aria-label={`Sell one ${item.name} for ${item.cost} coins`}
                          title={`Sell one for ${item.cost} coins`}
                        >
                          Sell +{item.cost}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleBuy(item.id)}
                        disabled={!affordable}
                        aria-label={
                          affordable
                            ? `Buy ${item.name} for ${item.cost} coins`
                            : `${item.name} costs ${item.cost} coins; need ${item.cost - coins} more`
                        }
                        className={`focus-ring rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${
                          affordable
                            ? 'bg-terracotta/15 text-terracotta-deep hover:bg-terracotta hover:text-ivory active:scale-95'
                            : 'cursor-not-allowed bg-ink/5 text-ink-soft/70'
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-ink/10 bg-white/25 px-6 py-3 text-[11px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <ShoppingBag size={13} className="text-sage-deep" />
            Purchases go to your hotbar. Select, then click the grid.
          </span>
          <span className="hidden shrink-0 sm:inline">B opens shop · Esc closes</span>
        </footer>
      </div>
    </div>
  );
}
