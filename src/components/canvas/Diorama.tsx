import { useEffect, useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { BASE_HEIGHT, ITEMS, ITEM_MAP } from '../../data/items';
import { findBase, findProp, isBasePiece } from '../../lib/grid';
import { playSound } from '../../lib/sound';
import { useWorldStore } from '../../store/useWorldStore';
import type { ActionResult, ItemCategory, ItemDef, Rotation } from '../../types';
import {
  InstancedItemBatch,
  LegacyPieces,
  FIRE_DAY_EMISSIVE,
  FIRE_NIGHT_EMISSIVE,
  WARM_DAY_EMISSIVE,
  WARM_NIGHT_EMISSIVE,
} from './InstancedItemBatch';
import { MiniatureModel } from './MiniatureModel';
import { preloadMiniatures } from './preloadMiniatures';

interface DioramaProps {
  onFeedback: (result: ActionResult, sound: 'place' | 'store' | 'error') => void;
}

interface HoverCell {
  x: number;
  z: number;
}

interface GhostState {
  cell: HoverCell;
  item: ItemDef;
  layer: ItemCategory;
  valid: boolean;
  rotation: number;
  extraItem?: ItemDef;
  extraRotation: number;
}

export function Diorama({ onFeedback }: DioramaProps) {
  const placedItems = useWorldStore((state) => state.placedItems);
  const inventory = useWorldStore((state) => state.inventory);
  const selectedItemId = useWorldStore((state) => state.selectedItemId);
  const selectedPieceId = useWorldStore((state) => state.selectedPieceId);
  const movingItemId = useWorldStore((state) => state.movingItemId);
  const movingRotation = useWorldStore((state) => state.movingRotation);
  const rotation = useWorldStore((state) => state.rotation);
  const themeMode = useWorldStore((state) => state.themeMode);
  const graphicsQuality = useWorldStore((state) => state.graphicsQuality);
  const storeMode = useWorldStore((state) => state.storeMode);
  const placeAt = useWorldStore((state) => state.placeAt);
  const selectPiece = useWorldStore((state) => state.selectPiece);
  const moveTo = useWorldStore((state) => state.moveTo);
  const cancelMove = useWorldStore((state) => state.cancelMove);
  const removeItem = useWorldStore((state) => state.removeItem);
  const removeAtCell = useWorldStore((state) => state.removeAtCell);
  const [hover, setHover] = useState<HoverCell | null>(null);

  useEffect(() => {
    preloadMiniatures(ITEMS);
  }, []);

  const selectedItem = selectedItemId ? ITEM_MAP[selectedItemId] : undefined;
  const selectedPiece = selectedPieceId
    ? placedItems.find((piece) => piece.id === selectedPieceId)
    : undefined;
  const selectedPieceItem = selectedPiece ? ITEM_MAP[selectedPiece.itemId] : undefined;
  const movingPiece = movingItemId
    ? placedItems.find((piece) => piece.id === movingItemId)
    : undefined;
  const movingItem = movingPiece ? ITEM_MAP[movingPiece.itemId] : undefined;
  const attachedProp =
    movingPiece && isBasePiece(movingPiece)
      ? findProp(placedItems, movingPiece.x, movingPiece.z)
      : undefined;
  const attachedItem = attachedProp ? ITEM_MAP[attachedProp.itemId] : undefined;

  const hiddenIds = useMemo(() => {
    const ids = new Set<string>();
    if (movingItemId) ids.add(movingItemId);
    if (attachedProp) ids.add(attachedProp.id);
    return ids;
  }, [movingItemId, attachedProp]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof placedItems>();
    for (const piece of placedItems) {
      if (!ITEM_MAP[piece.itemId]) continue;
      const list = map.get(piece.itemId) ?? [];
      list.push(piece);
      map.set(piece.itemId, list);
    }
    return Array.from(map.entries()).flatMap(([itemId, pieces]) => {
      const item = ITEM_MAP[itemId];
      return item ? [{ item, pieces }] : [];
    });
  }, [placedItems]);

  const ghost = useMemo<GhostState | null>(() => {
    const cell =
      hover ?? (movingPiece ? { x: movingPiece.x, z: movingPiece.z } : null);
    if (!cell) return null;

    if (selectedItem) {
      const base = findBase(placedItems, cell.x, cell.z);
      const prop = findProp(placedItems, cell.x, cell.z);
      const stock = inventory[selectedItem.id] ?? 0;
      const valid =
        selectedItem.category === 'base'
          ? !base && stock > 0
          : Boolean(base) && !prop && stock > 0;
      return {
        cell,
        item: selectedItem,
        layer: selectedItem.category,
        valid,
        rotation,
        extraRotation: 0,
      };
    }

    if (movingPiece && movingItem) {
      const others = placedItems.filter(
        (piece) => piece.id !== movingPiece.id && piece.id !== attachedProp?.id,
      );
      const base = findBase(others, cell.x, cell.z);
      const prop = findProp(others, cell.x, cell.z);
      let valid: boolean;
      if (movingItem.category === 'base') {
        valid = !base && !prop;
      } else {
        valid = Boolean(base) && !prop;
      }
      if (cell.x === movingPiece.x && cell.z === movingPiece.z) {
        valid = true;
      }
      const rotationDelta = (movingRotation - movingPiece.rotation + 4) % 4;
      return {
        cell,
        item: movingItem,
        layer: movingItem.category,
        valid,
        rotation: movingRotation,
        extraItem: attachedItem,
        extraRotation: attachedProp
          ? (((attachedProp.rotation + rotationDelta) % 4) as Rotation)
          : 0,
      };
    }

    return null;
  }, [
    hover,
    selectedItem,
    rotation,
    inventory,
    placedItems,
    movingPiece,
    movingItem,
    movingRotation,
    attachedProp,
    attachedItem,
  ]);

  function cellFromPoint(point: { x: number; z: number }): HoverCell {
    return {
      x: Math.max(-250, Math.min(250, Math.round(point.x))),
      z: Math.max(-250, Math.min(250, Math.round(point.z))),
    };
  }

  function handlePlaneMove(event: ThreeEvent<PointerEvent>) {
    const cell = cellFromPoint(event.point);
    setHover((current) =>
      current && current.x === cell.x && current.z === cell.z ? current : cell,
    );
  }

  function handlePlaneClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (storeMode) {
      const result = removeAtCell(event.point.x, event.point.z);
      onFeedback(result, result.ok ? 'store' : 'error');
      return;
    }
    if (movingItemId) {
      const result = moveTo(event.point.x, event.point.z);
      onFeedback(result, result.ok ? 'place' : 'error');
      return;
    }
    if (selectedItem) {
      const result = placeAt(event.point.x, event.point.z);
      onFeedback(result, result.ok ? 'place' : 'error');
      return;
    }
    if (selectedPieceId) selectPiece(null);
  }

  function handlePieceClick(id: string) {
    if (storeMode) {
      const result = removeItem(id);
      onFeedback(result, result.ok ? 'store' : 'error');
      return;
    }
    if (movingItemId) {
      const piece = placedItems.find((entry) => entry.id === id);
      if (!piece) return;
      const result = moveTo(piece.x, piece.z);
      onFeedback(result, result.ok ? 'place' : 'error');
      return;
    }
    if (selectedItem) {
      const piece = placedItems.find((entry) => entry.id === id);
      if (!piece) return;
      const result = placeAt(piece.x, piece.z);
      onFeedback(result, result.ok ? 'place' : 'error');
      return;
    }
    selectPiece(id);
    playSound('ui');
  }

  function handlePieceContext(id: string) {
    if (movingItemId) {
      cancelMove();
      onFeedback({ ok: true, message: 'Move cancelled.' }, 'store');
      return;
    }
    const result = removeItem(id);
    onFeedback(result, result.ok ? 'store' : 'error');
  }

  return (
    <group>
      {groups.map(({ item, pieces }) =>
        item.procedural ? (
          <LegacyPieces
            key={item.id}
            item={item}
            pieces={pieces.filter((piece) => !hiddenIds.has(piece.id))}
            onPieceClick={handlePieceClick}
            onPieceContext={handlePieceContext}
          />
        ) : (
        <InstancedItemBatch
          key={item.id}
          item={item}
          pieces={pieces}
          hiddenIds={hiddenIds}
          warmEmissive={Boolean(item.light)}
          warmEmissiveIntensity={
            item.id === 'cottage'
              ? themeMode === 'night'
                ? 2.0
                : 0
              : themeMode === 'night'
                ? 2.4
                : graphicsQuality === 'high'
                  ? 1.4
                  : 1.8
          }
          warmEmissiveColor={
            item.id === 'cottage'
              ? themeMode === 'night'
                ? '#FFE46B'
                : '#FFF6DB'
              : item.light === 'fire'
                ? themeMode === 'night'
                  ? FIRE_NIGHT_EMISSIVE
                  : FIRE_DAY_EMISSIVE
                : themeMode === 'night'
                  ? WARM_NIGHT_EMISSIVE
                  : WARM_DAY_EMISSIVE
          }
          onPieceClick={handlePieceClick}
          onPieceContext={handlePieceContext}
        />
        ),
      )}

      {selectedPiece && selectedPieceItem ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            selectedPiece.x,
            selectedPieceItem.category === 'base' ? BASE_HEIGHT + 0.015 : BASE_HEIGHT + 0.002,
            selectedPiece.z,
          ]}
        >
          <planeGeometry args={[0.98, 0.98]} />
          <meshBasicMaterial
            color="#93A87B"
            transparent
            opacity={0.22}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      ) : null}

      {ghost ? (
        <group>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              ghost.cell.x,
              ghost.layer === 'base' ? BASE_HEIGHT + 0.02 : BASE_HEIGHT + 0.012,
              ghost.cell.z,
            ]}
          >
            <planeGeometry args={[0.94, 0.94]} />
            <meshBasicMaterial
              color={ghost.valid ? '#8FD49A' : '#E8837C'}
              transparent
              opacity={0.18}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          <group
            position={[ghost.cell.x, ghost.layer === 'base' ? 0 : BASE_HEIGHT, ghost.cell.z]}
          >
            <MiniatureModel
              item={ghost.item}
              ghost
              valid={ghost.valid}
              rotation={ghost.rotation}
            />
            {ghost.extraItem ? (
              <group position={[0, BASE_HEIGHT, 0]}>
                <MiniatureModel
                  item={ghost.extraItem}
                  ghost
                  valid={ghost.valid}
                  rotation={ghost.extraRotation}
                />
              </group>
            ) : null}
          </group>
        </group>
      ) : null}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerMove={handlePlaneMove}
        onPointerOut={() => setHover(null)}
        onClick={handlePlaneClick}
        visible
      >
        <planeGeometry args={[220, 220]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>
    </group>
  );
}
