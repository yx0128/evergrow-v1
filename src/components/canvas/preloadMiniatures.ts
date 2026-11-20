import { useGLTF } from '@react-three/drei';
import type { ItemDef } from '../../types';

export function preloadMiniatures(items: ItemDef[]): void {
  for (const item of items) {
    useGLTF.preload(item.modelUrl);
  }
}
