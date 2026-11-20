import { useEffect, useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { ITEMS, ITEM_MAP } from '../../data/items';
import { findBase, findProp } from '../../lib/grid';
import { useWorldStore } from '../../store/useWorldStore';
import type { ActionResult } from '../../types';
import { MiniatureModel } from './MiniatureModel';
import { preloadMiniatures } from './preloadMiniatures';

interface DioramaProps {
  onFeedback: (result: ActionResult, sound: 'place' | 'store' | 'error') => void;
}

interface HoverCell {
  x: number;
  z: number;
}

export function Diorama({ onFeedback }: DioramaProps) {
  const placedItems = useWorldStore((state) => state.placedItems);
  const inventory = useWorldStore((state) => state.inventory);
  const selectedItemId = useWorldStore((state) => state.selectedItemId);
  const rotation = useWorldStore((state) => state.rotation);
  const storeMode = useWorldStore((state) => state.storeMode);
  const placeAt = useWorldStore((state) => state.placeAt);
  const removeItem = useWorldStore((state) => state.removeItem);
  const removeAtCell = useWorldStore((state) => state.removeAtCell);
  const [hover, setHover] = useState<HoverCell | null>(null);

  useEffect(() => {
    preloadMiniatures(ITEMS);
  }, []);

  const selectedItem = selectedItemId ? ITEM_MAP[selectedItemId] : undefined;

  const ghostPlacement = useMemo(() => {
    if (!hover || !selectedItem) return null;
    const base = findBase(placedItems, hover.x, hover.z);
    const prop = findProp(placedItems, hover.x, hover.z);
    const stock = inventory[selectedItem.id] ?? 0;
    const valid =
      selectedItem.category === 'base'
        ? !base && stock > 0
        : Boolean(base) && !prop && stock > 0;
    return {
      valid,
      y: selectedItem.category === 'base' ? 0 : 0.35,
    };
  }, [hover, selectedItem, placedItems, inventory]);

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
      if (!result.ok) onFeedback(result, 'error');
      else onFeedback(result, 'store');
      return;
    }
    if (!selectedItem) return;
    const result = placeAt(event.point.x, event.point.z);
    onFeedback(result, result.ok ? 'place' : 'error');
  }

  function handlePieceClick(event: ThreeEvent<MouseEvent>, id: string) {
    event.stopPropagation();
    if (storeMode) {
      const result = removeItem(id);
      onFeedback(result, result.ok ? 'store' : 'error');
      return;
    }
    if (selectedItem) {
      const piece = placedItems.find((entry) => entry.id === id);
      if (!piece) return;
      const result = placeAt(piece.x, piece.z);
      onFeedback(result, result.ok ? 'place' : 'error');
    }
  }

  function handlePieceContext(event: ThreeEvent<MouseEvent>, id: string) {
    event.stopPropagation();
    const result = removeItem(id);
    onFeedback(result, result.ok ? 'store' : 'error');
  }

  return (
    <group>
      {placedItems.map((piece) => {
        const item = ITEM_MAP[piece.itemId];
        if (!item) return null;
        return (
          <group
            key={piece.id}
            position={[piece.x, item.category === 'base' ? 0 : 0.35, piece.z]}
            onClick={(event) => handlePieceClick(event, piece.id)}
            onContextMenu={(event) => handlePieceContext(event, piece.id)}
          >
            <MiniatureModel
              item={item}
              rotation={piece.rotation}
              placedAt={piece.placedAt}
              animate
            />
          </group>
        );
      })}

      {hover && selectedItem && ghostPlacement ? (
        <group>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[hover.x, selectedItem.category === 'base' ? 0.37 : 0.362, hover.z]}
          >
            <planeGeometry args={[0.94, 0.94]} />
            <meshBasicMaterial
              color={ghostPlacement.valid ? '#8FD49A' : '#E8837C'}
              transparent
              opacity={0.18}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          <group position={[hover.x, ghostPlacement.y, hover.z]}>
            <MiniatureModel
              item={selectedItem}
              ghost
              valid={ghostPlacement.valid}
              rotation={rotation}
            />
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
