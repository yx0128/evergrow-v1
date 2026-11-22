import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { ITEM_MAP } from './data/items';
import { createId } from './lib/id';
import {
  HOTBAR_PAGE_COUNT,
  clampHotbarPage,
  getHotbarSlots,
  hotbarPageForItem,
} from './lib/hotbar';
import { playSound } from './lib/sound';
import { useWorldStore } from './store/useWorldStore';
import { WorldCanvas } from './components/canvas/Scene';
import { BuildShop } from './components/ui/BuildShop';
import { ControlsLegend } from './components/ui/ControlsLegend';
import { InventoryHotbar } from './components/ui/InventoryHotbar';
import { TaskDrawer } from './components/ui/TaskDrawer';
import { Toasts } from './components/ui/Toasts';
import { TopBar } from './components/ui/TopBar';
import type { ActionResult } from './types';
import type { ToastItem, ToastTone } from './types-ui';

export default function App() {
  const inventory = useWorldStore((state) => state.inventory);
  const placedItems = useWorldStore((state) => state.placedItems);
  const themeMode = useWorldStore((state) => state.themeMode);
  const graphicsQuality = useWorldStore((state) => state.graphicsQuality);
  const selectedItemId = useWorldStore((state) => state.selectedItemId);
  const selectedPieceId = useWorldStore((state) => state.selectedPieceId);
  const movingItemId = useWorldStore((state) => state.movingItemId);
  const movingRotation = useWorldStore((state) => state.movingRotation);
  const rotation = useWorldStore((state) => state.rotation);
  const storeMode = useWorldStore((state) => state.storeMode);
  const toggleTheme = useWorldStore((state) => state.toggleTheme);
  const toggleGraphicsQuality = useWorldStore((state) => state.toggleGraphicsQuality);
  const selectItem = useWorldStore((state) => state.selectItem);
  const selectPiece = useWorldStore((state) => state.selectPiece);
  const rotate = useWorldStore((state) => state.rotate);
  const toggleStoreMode = useWorldStore((state) => state.toggleStoreMode);
  const beginMove = useWorldStore((state) => state.beginMove);
  const cancelMove = useWorldStore((state) => state.cancelMove);
  const removeItem = useWorldStore((state) => state.removeItem);

  const [tasksOpen, setTasksOpen] = useState(true);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopFocusItemId, setShopFocusItemId] = useState<string | null>(null);
  const [hotbarPage, setHotbarPage] = useState(0);
  const [uiHidden, setUiHidden] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const movingItem = useMemo(() => {
    const piece = movingItemId
      ? placedItems.find((entry) => entry.id === movingItemId)
      : undefined;
    return piece ? ITEM_MAP[piece.itemId] ?? null : null;
  }, [movingItemId, placedItems]);

  const selectedPiece = useMemo(
    () =>
      selectedPieceId
        ? placedItems.find((entry) => entry.id === selectedPieceId)
        : undefined,
    [selectedPieceId, placedItems],
  );
  const selectedPieceItem = selectedPiece
    ? ITEM_MAP[selectedPiece.itemId] ?? null
    : null;
  const effectiveRotation = movingItem
    ? movingRotation
    : selectedPiece
      ? selectedPiece.rotation
      : rotation;

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone) => {
      const id = createId('toast');
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, 2800);
      timers.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const handleFeedback = useCallback(
    (result: ActionResult, sound: 'place' | 'store' | 'error') => {
      playSound(result.ok ? sound : 'error');
      pushToast(result.message, result.ok ? 'success' : 'error');
    },
    [pushToast],
  );

  const handleResetCamera = useCallback(() => {
    setResetSignal((value) => value + 1);
    playSound('ui');
  }, []);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
    playSound('ui');
  }, [toggleTheme]);

  const openShopForItem = useCallback((itemId: string) => {
    setShopFocusItemId(itemId);
    setShopOpen(true);
    playSound('ui');
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing) {
        if (event.key === 'Escape') target.blur();
        return;
      }

      if (shopOpen) {
        if (event.key === 'b' || event.key === 'B') {
          event.preventDefault();
          setShopOpen(false);
          setShopFocusItemId(null);
          playSound('ui');
        } else if (event.key === 'Escape') {
          setShopOpen(false);
          setShopFocusItemId(null);
        }
        return;
      }

      if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        setHotbarPage((current) =>
          clampHotbarPage(current + (event.key === ']' ? 1 : -1)),
        );
        playSound('ui');
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        rotate();
        playSound('ui');
        return;
      }
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        setShopFocusItemId(null);
        setShopOpen((open) => !open);
        playSound('ui');
        return;
      }
      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        setUiHidden((hidden) => !hidden);
        playSound('ui');
        return;
      }
      if (event.key === 'Escape') {
        setShopOpen(false);
        setShopFocusItemId(null);
        cancelMove();
        selectPiece(null);
        selectItem(null);
        return;
      }
      if ((event.key === 'm' || event.key === 'M') && selectedPieceId) {
        event.preventDefault();
        const result = beginMove(selectedPieceId);
        if (!result.ok) pushToast(result.message, 'error');
        else playSound('ui');
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const item = getHotbarSlots(hotbarPage)[index]?.item;
        if (!item) return;
        if ((inventory[item.id] ?? 0) > 0) {
          selectItem(item.id);
          playSound('ui');
        } else {
          openShopForItem(item.id);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shopOpen,
    hotbarPage,
    inventory,
    openShopForItem,
    rotate,
    selectItem,
    selectPiece,
    cancelMove,
    selectedPieceId,
    beginMove,
    pushToast,
  ]);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden ${
        themeMode === 'night' ? 'bg-night' : 'bg-cream'
      }`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <WorldCanvas resetSignal={resetSignal} onFeedback={handleFeedback} />

      {uiHidden ? (
        <button
          type="button"
          onClick={() => setUiHidden(false)}
          className="glass-pill focus-ring absolute right-4 top-4 z-40 flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-semibold text-ink shadow-float"
          aria-label="Show interface"
        >
          <Eye size={14} />
          Show interface
          <span className="rounded bg-ink/10 px-1 font-mono text-[9px]">H</span>
        </button>
      ) : (
        <>
          <TopBar
            themeMode={themeMode}
            graphicsQuality={graphicsQuality}
            onToggleTheme={handleToggleTheme}
            onToggleGraphicsQuality={() => {
              toggleGraphicsQuality();
              playSound('ui');
            }}
            onResetCamera={handleResetCamera}
            onHideUI={() => {
              setUiHidden(true);
              playSound('ui');
            }}
          />

          <TaskDrawer
            open={tasksOpen}
            onToggle={() => {
              setTasksOpen((open) => !open);
              playSound('ui');
            }}
            onReset={() => setHotbarPage(0)}
            onToast={pushToast}
          />

          <ControlsLegend />

          <InventoryHotbar
            page={hotbarPage}
            pageCount={HOTBAR_PAGE_COUNT}
            inventory={inventory}
            selectedId={selectedItemId}
            selectedPiece={selectedPieceItem}
            movingItem={movingItem}
            rotation={effectiveRotation}
            storeMode={storeMode}
            onSelect={selectItem}
            onOpenShopForItem={openShopForItem}
            onPageChange={(page) => {
              setHotbarPage(clampHotbarPage(page));
              playSound('ui');
            }}
            onRotate={rotate}
            onToggleStoreMode={() => {
              if (selectedPieceId) {
                const result = removeItem(selectedPieceId);
                handleFeedback(result, result.ok ? 'store' : 'error');
                return;
              }
              toggleStoreMode();
              playSound('ui');
            }}
            onMoveSelected={() => {
              if (!selectedPieceId) return;
              const result = beginMove(selectedPieceId);
              if (!result.ok) pushToast(result.message, 'error');
              else playSound('ui');
            }}
            onDeselect={() => {
              selectPiece(null);
              playSound('ui');
            }}
            onCancelMove={() => {
              cancelMove();
              playSound('ui');
            }}
            onOpenShop={() => {
              setShopFocusItemId(null);
              setShopOpen(true);
              playSound('ui');
            }}
          />

          <Toasts toasts={toasts} onDismiss={dismissToast} />

          <BuildShop
            open={shopOpen}
            focusItemId={shopFocusItemId}
            onPurchased={(itemId) => setHotbarPage(hotbarPageForItem(itemId))}
            onClose={() => {
              setShopOpen(false);
              setShopFocusItemId(null);
              playSound('ui');
            }}
            onToast={pushToast}
          />
        </>
      )}
    </div>
  );
}
