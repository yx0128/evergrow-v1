import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ITEM_MAP } from '../../data/items';
import { useWorldStore } from '../../store/useWorldStore';

const POOL_SIZE = 6;
const DEFAULT_TARGET = new THREE.Vector3(0, 0.35, 0);

interface LightCandidate {
  position: THREE.Vector3;
  color: string;
  intensity: number;
  distance: number;
}

export function LightingPool() {
  const placedItems = useWorldStore((state) => state.placedItems);
  const themeMode = useWorldStore((state) => state.themeMode);
  const controls = useThree((state) => state.controls) as
    | { target?: THREE.Vector3 }
    | null;
  const pool = useRef<(THREE.PointLight | null)[]>([]);

  const candidates = useMemo<LightCandidate[]>(
    () =>
      placedItems.flatMap((piece) => {
        const item = ITEM_MAP[piece.itemId];
        if (!item?.light) return [];
        const height = item.light === 'fire' ? 0.42 : 0.52;
        return [
          {
            position: new THREE.Vector3(piece.x, 0.35 + height, piece.z),
            color: item.light === 'fire' ? '#FF8A4C' : '#FFC477',
            intensity: item.light === 'fire' ? 3.2 : 2.6,
            distance: item.light === 'fire' ? 5.5 : 4.8,
          },
        ];
      }),
    [placedItems],
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
          color="#FFC477"
          intensity={0}
          distance={5}
          decay={2}
          castShadow={false}
        />
      ))}
    </>
  );
}
