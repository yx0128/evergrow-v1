import {
  Component,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { BASE_HEIGHT, FOOTPRINT } from '../../data/items';
import { rotationToRadians } from '../../lib/grid';
import type { ItemDef, PlacedItem } from '../../types';
import { MiniatureModel } from './MiniatureModel';
import { tuneMaterial } from './tuneMaterial';

const CHUNK_SIZE = 512;
const PLACEMENT_MS = 460;
export const WARM_DAY_EMISSIVE = '#FFA62B';
export const WARM_NIGHT_EMISSIVE = '#FFF6DB';
export const FIRE_DAY_EMISSIVE = '#FF741F';
export const FIRE_NIGHT_EMISSIVE = '#FF5E0E';

interface BatchProps {
  item: ItemDef;
  pieces: PlacedItem[];
  hiddenIds: Set<string>;
  warmEmissive: boolean;
  warmEmissiveIntensity: number;
  warmEmissiveColor: string;
  onPieceClick: (id: string) => void;
  onPieceContext: (id: string) => void;
}

interface Primitive {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function useNormalizedPrimitives(
  item: ItemDef,
  warmEmissive: boolean,
  warmEmissiveIntensity: number,
  warmEmissiveColor: string,
): Primitive[] {
  const { scene } = useGLTF(item.modelUrl);

  return useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const horizontal = Math.max(size.x, size.z, 0.0001);
    const scale = (FOOTPRINT * (item.modelScale ?? 1)) / horizontal;
    const verticalScale =
      item.category === 'base'
        ? BASE_HEIGHT / Math.max(size.y, 0.0001)
        : scale * (item.modelHeightScale ?? 1);

    clone.position.set(
      -center.x * scale,
      -box.min.y * verticalScale,
      -center.z * scale,
    );
    clone.scale.set(scale, verticalScale, scale);
    clone.updateMatrixWorld(true);

    const warmMaterials = new Map<THREE.Material, THREE.Material>();
    const warmMaterial = (material: THREE.Material): THREE.Material => {
      if (!warmEmissive) return material;
      const standard = material as THREE.MeshStandardMaterial;
      if (
        !standard.isMeshStandardMaterial ||
        standard.emissiveIntensity < 3.5
      ) {
        return material;
      }
      const cached = warmMaterials.get(material);
      if (cached) return cached;
      const cloneMaterial = standard.clone();
      cloneMaterial.emissive.set(warmEmissiveColor);
      cloneMaterial.emissiveIntensity = warmEmissiveIntensity;
      warmMaterials.set(material, cloneMaterial);
      return cloneMaterial;
    };

    const primitives: Primitive[] = [];
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      primitives.push({
        geometry,
        material: Array.isArray(mesh.material)
          ? mesh.material.map((m) => tuneMaterial(warmMaterial(m)))
          : tuneMaterial(warmMaterial(mesh.material)),
      });
    });
    return primitives;
  }, [
    scene,
    item.category,
    item.modelScale,
    item.modelHeightScale,
    warmEmissive,
    warmEmissiveIntensity,
    warmEmissiveColor,
  ]);
}

function InstancedPrimitive({
  item,
  pieces,
  geometry,
  material,
  onPieceClick,
  onPieceContext,
}: {
  item: ItemDef;
  pieces: PlacedItem[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  onPieceClick: (id: string) => void;
  onPieceContext: (id: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const animating = useRef(true);
  const waterMaterials = useMemo(
    () =>
      (Array.isArray(material) ? material : [material]).filter(
        (entry): entry is THREE.MeshPhysicalMaterial =>
          entry.name === 'water_surface' &&
          (entry as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial,
      ),
    [material],
  );
  const layerY = item.category === 'base' ? 0 : BASE_HEIGHT;
  const applyMatrices = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = pieces.length;
    const now = Date.now();
    let stillAnimating = false;

    pieces.forEach((piece, index) => {
      const t = Math.min(
        1,
        Math.max(0, (now - piece.placedAt) / PLACEMENT_MS),
      );
      if (t < 1) stillAnimating = true;
      const scale = t >= 1 ? 1 : Math.max(0.02, easeOutBack(t));
      dummy.position.set(piece.x, layerY, piece.z);
      dummy.rotation.set(0, rotationToRadians(piece.rotation), 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    animating.current = stillAnimating;
  }, [dummy, layerY, pieces]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    applyMatrices();
  }, [applyMatrices, geometry, material]);


  useFrame(({ clock }) => {
    if (waterMaterials.length > 0) {
      const shimmer = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 0.7);
      for (const entry of waterMaterials) {
        entry.roughness = 0.19 + shimmer * 0.02;
        entry.clearcoatRoughness = 0.17 + shimmer * 0.02;
        entry.envMapIntensity = 0.23 + shimmer * 0.04;
      }
    }
    if (!animating.current) return;
    applyMatrices();
  });

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    const piece = pieces[event.instanceId];
    if (piece) onPieceClick(piece.id);
  }

  function handleContext(event: ThreeEvent<MouseEvent>) {
    if (event.instanceId === undefined) return;
    event.stopPropagation();
    const piece = pieces[event.instanceId];
    if (piece) onPieceContext(piece.id);
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, Math.max(1, pieces.length)]}
      castShadow
      receiveShadow
      frustumCulled={false}
      onClick={handleClick}
      onContextMenu={handleContext}
    />
  );
}

class BatchErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // The legacy renderer keeps the world usable when an asset cannot be instanced.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function LegacyPieces({
  item,
  pieces,
  onPieceClick,
  onPieceContext,
}: {
  item: ItemDef;
  pieces: PlacedItem[];
  onPieceClick: (id: string) => void;
  onPieceContext: (id: string) => void;
}) {
  return (
    <>
      {pieces.map((piece) => (
        <group
          key={piece.id}
          position={[
            piece.x,
            item.category === 'base' ? 0 : BASE_HEIGHT,
            piece.z,
          ]}
          onClick={(event) => {
            event.stopPropagation();
            onPieceClick(piece.id);
          }}
          onContextMenu={(event) => {
            event.stopPropagation();
            onPieceContext(piece.id);
          }}
        >
          <MiniatureModel
            item={item}
            rotation={piece.rotation}
            placedAt={piece.placedAt}
            animate
          />
        </group>
      ))}
    </>
  );
}

function BatchContent({
  item,
  pieces,
  warmEmissive,
  warmEmissiveIntensity,
  warmEmissiveColor,
  onPieceClick,
  onPieceContext,
}: BatchProps) {
  const primitives = useNormalizedPrimitives(
    item,
    warmEmissive,
    warmEmissiveIntensity,
    warmEmissiveColor,
  );
  const chunks = useMemo(() => {
    const result: PlacedItem[][] = [];
    for (let index = 0; index < pieces.length; index += CHUNK_SIZE) {
      result.push(pieces.slice(index, index + CHUNK_SIZE));
    }
    return result;
  }, [pieces]);

  return (
    <>
      {primitives.map((primitive, primitiveIndex) =>
        chunks.map((chunk, chunkIndex) => (
          <InstancedPrimitive
            key={`${primitiveIndex}-${chunkIndex}`}
            item={item}
            pieces={chunk}
            geometry={primitive.geometry}
            material={primitive.material}
            onPieceClick={onPieceClick}
            onPieceContext={onPieceContext}
          />
        )),
      )}
    </>
  );
}

export function InstancedItemBatch({
  item,
  pieces,
  hiddenIds,
  warmEmissive,
  warmEmissiveIntensity,
  warmEmissiveColor,
  onPieceClick,
  onPieceContext,
}: BatchProps) {
  const visiblePieces = useMemo(
    () => pieces.filter((piece) => !hiddenIds.has(piece.id)),
    [pieces, hiddenIds],
  );

  if (visiblePieces.length === 0) return null;

  return (
    <BatchErrorBoundary
      fallback={
        <LegacyPieces
          item={item}
          pieces={visiblePieces}
          onPieceClick={onPieceClick}
          onPieceContext={onPieceContext}
        />
      }
    >
      <Suspense fallback={null}>
        <BatchContent
          item={item}
          pieces={visiblePieces}
          hiddenIds={hiddenIds}
          warmEmissive={warmEmissive}
          warmEmissiveIntensity={warmEmissiveIntensity}
          warmEmissiveColor={warmEmissiveColor}
          onPieceClick={onPieceClick}
          onPieceContext={onPieceContext}
        />
      </Suspense>
    </BatchErrorBoundary>
  );
}
