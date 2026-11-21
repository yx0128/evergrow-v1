import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Html, RoundedBox, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BASE_HEIGHT, FOOTPRINT } from '../../data/items';
import { rotationToRadians } from '../../lib/grid';
import type { ItemDef } from '../../types';

interface MiniatureModelProps {
  item: ItemDef;
  ghost?: boolean;
  valid?: boolean;
  rotation?: number;
  placedAt?: number;
  animate?: boolean;
}

class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // The placeholder keeps the diorama usable when a GLB is missing.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Placeholder({
  item,
  ghost,
  valid,
}: {
  item: ItemDef;
  ghost: boolean;
  valid: boolean;
}) {
  const height = item.category === 'base' ? BASE_HEIGHT : 0.72;
  const color = ghost ? (valid ? '#86CE93' : '#E47F79') : item.accent;
  return (
    <group>
      <RoundedBox
        args={[0.68, height, 0.68]}
        radius={0.06}
        smoothness={3}
        position={[0, height / 2, 0]}
        castShadow={!ghost}
        receiveShadow={!ghost}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.84}
          metalness={0.01}
          transparent={ghost}
          opacity={ghost ? 0.44 : 1}
          depthWrite={!ghost}
        />
      </RoundedBox>
      <Html
        center
        position={[0, height + 0.18, 0]}
        distanceFactor={9}
        style={{ pointerEvents: 'none' }}
      >
        <div className="whitespace-nowrap rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-ivory">
          {item.name}
        </div>
      </Html>
    </group>
  );
}

function ModelContent({
  item,
  ghost,
  valid,
}: {
  item: ItemDef;
  ghost: boolean;
  valid: boolean;
}) {
  const { scene } = useGLTF(item.modelUrl);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const horizontal = Math.max(size.x, size.z, 0.0001);
    const scale = (FOOTPRINT * (item.modelScale ?? 1)) / horizontal;
    const verticalScale =
      item.category === 'base' ? BASE_HEIGHT / Math.max(size.y, 0.0001) : scale;
    const offset: [number, number, number] = [
      -center.x * scale,
      -box.min.y * verticalScale,
      -center.z * scale,
    ];
    const ghostMaterial = ghost
      ? new THREE.MeshStandardMaterial({
          color: valid ? '#7FCB8B' : '#E27D76',
          emissive: valid ? '#4A9A58' : '#B94840',
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.44,
          roughness: 0.68,
          metalness: 0,
          depthWrite: false,
        })
      : null;

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !ghost;
      mesh.receiveShadow = !ghost;
      if (ghostMaterial) mesh.material = ghostMaterial;
    });

    return { clone, scale, verticalScale, offset, ghostMaterial };
  }, [scene, ghost, valid, item.category, item.modelScale]);

  useEffect(() => {
    return () => {
      prepared.ghostMaterial?.dispose();
    };
  }, [prepared]);

  return (
    <group
      position={prepared.offset}
      scale={[prepared.scale, prepared.verticalScale, prepared.scale]}
    >
      <primitive object={prepared.clone} />
    </group>
  );
}

export function MiniatureModel({
  item,
  ghost = false,
  valid = true,
  rotation = 0,
  placedAt,
  animate = false,
}: MiniatureModelProps) {
  const animRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!animate || !placedAt || !animRef.current) return;
    const t = Math.min(1, Math.max(0, (Date.now() - placedAt) / 460));
    if (t >= 1) {
      animRef.current.scale.setScalar(1);
      return;
    }
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    animRef.current.scale.setScalar(Math.max(0.02, eased));
  });

  return (
    <group rotation={[0, rotationToRadians(rotation), 0]}>
      <group ref={animRef}>
        <ModelErrorBoundary
          fallback={<Placeholder item={item} ghost={ghost} valid={valid} />}
        >
          <Suspense
            fallback={<Placeholder item={item} ghost={ghost} valid={valid} />}
          >
            <ModelContent item={item} ghost={ghost} valid={valid} />
          </Suspense>
        </ModelErrorBoundary>
      </group>    </group>
  );
}
