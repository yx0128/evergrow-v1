import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BASE_HEIGHT, ITEM_MAP } from '../../data/items';
import { findProp, isBasePiece } from '../../lib/grid';
import { useWorldStore } from '../../store/useWorldStore';

const POOL_SIZE = 10;
const DEFAULT_TARGET = new THREE.Vector3(0, BASE_HEIGHT, 0);

interface LightCandidate {
  position: THREE.Vector3;
  color: string;
  intensity: number;
  distance: number;
}

export function LightingPool() {
  const placedItems = useWorldStore((state) => state.placedItems);
  const themeMode = useWorldStore((state) => state.themeMode);
  const movingItemId = useWorldStore((state) => state.movingItemId);
  const controls = useThree((state) => state.controls) as
    | { target?: THREE.Vector3 }
    | null;
  const pool = useRef<(THREE.PointLight | null)[]>([]);

  const hiddenIds = useMemo(() => {
    const ids = new Set<string>();
    const moving = placedItems.find((piece) => piece.id === movingItemId);
    if (!moving) return ids;
    ids.add(moving.id);
    if (isBasePiece(moving)) {
      const attached = findProp(placedItems, moving.x, moving.z);
      if (attached) ids.add(attached.id);
    }
    return ids;
  }, [placedItems, movingItemId]);

  const candidates = useMemo<LightCandidate[]>(
    () =>
      placedItems.flatMap((piece) => {
        if (hiddenIds.has(piece.id)) return [];
        const item = ITEM_MAP[piece.itemId];
        if (!item?.light) return [];
        const height =
          item.light === 'fire'
            ? 0.36
            : item.id === 'paper_lantern'
              ? 0.47
              : item.id === 'cottage'
                ? 0.35
                : 0.52;
        return [
          {
            position: new THREE.Vector3(piece.x, BASE_HEIGHT + height, piece.z),
            color:
              item.light === 'fire'
                ? '#FF731C'
                : item.id === 'paper_lantern' || item.id === 'cottage'
                  ? '#FFE066'
                  : '#FFF0C8',
            intensity: item.light === 'fire' ? 2.2 : 3.0,
            distance: 9.5,
          },
        ];
      }),
    [placedItems, hiddenIds],
  );

  useFrame(() => {
    const lights = pool.current;
    if (themeMode !== 'night') {
      for (const light of lights) {
        if (light) light.intensity = 0;
      }
      return;
    }

    const target = controls?.target ?? DEFAULT_TARGET;
    const nearest = [...candidates]
      .sort(
        (a, b) =>
          a.position.distanceToSquared(target) - b.position.distanceToSquared(target),
      )
      .slice(0, POOL_SIZE);

    for (let index = 0; index < POOL_SIZE; index += 1) {
      const light = lights[index];
      if (!light) continue;
      const candidate = nearest[index];
      if (candidate) {
        light.position.copy(candidate.position);
        light.color.set(candidate.color);
        light.distance = candidate.distance;
        light.intensity = candidate.intensity;
      } else {
        light.intensity = 0;
      }
    }
  });

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, index) => (
        <pointLight
          key={index}
          ref={(node) => {
            pool.current[index] = node;
          }}
          color="#FFC978"
          intensity={0}
          distance={9.5}
          decay={1.15}
          castShadow={false}
        />
      ))}
    </>
  );
}
