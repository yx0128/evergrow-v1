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
import { useWorldStore } from '../../store/useWorldStore';
import type { ItemDef } from '../../types';
import { tuneMaterial } from './tuneMaterial';

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
          envMapIntensity={0.35}
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
          envMapIntensity: 0.35,
          depthWrite: false,
        })
      : null;

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !ghost;
      mesh.receiveShadow = !ghost;
      if (ghostMaterial) mesh.material = ghostMaterial;
      else if (Array.isArray(mesh.material)) mesh.material.forEach(tuneMaterial);
      else tuneMaterial(mesh.material);
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

function PaperLanternModel({
  ghost,
  valid,
}: {
  ghost: boolean;
  valid: boolean;
}) {
  const night = useWorldStore((state) => state.themeMode === 'night');
  const wood = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#C98B4B',
        roughness: 0.78,
        metalness: 0.02,
        envMapIntensity: 0.35,
      }),
    [],
  );
  const paper = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#F8EDCB',
        roughness: 0.72,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
        envMapIntensity: 0.35,
      }),
    [],
  );
  const ghostMaterial = useMemo(
    () =>
      ghost
        ? new THREE.MeshStandardMaterial({
            color: valid ? '#7FCB8B' : '#E27D76',
            emissive: valid ? '#4A9A58' : '#B94840',
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.44,
            roughness: 0.68,
            metalness: 0,
            envMapIntensity: 0.35,
            depthWrite: false,
          })
        : null,
    [ghost, valid],
  );

  useEffect(() => {
    paper.emissive.set('#FFE46B');
    paper.emissiveIntensity = night ? 1.0 : 0.15;
  }, [paper, night]);

  useEffect(
    () => () => {
      wood.dispose();
      paper.dispose();
      ghostMaterial?.dispose();
    },
    [wood, paper, ghostMaterial],
  );

  const woodMaterial = ghostMaterial ?? wood;
  const paperMaterial = ghostMaterial ?? paper;
  const posts = [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ];

  return (
    <group scale={[0.486, 0.6, 0.486]}>
      <mesh
        position={[0, 0.033, 0]}
        material={woodMaterial}
        castShadow={!ghost}
        receiveShadow={!ghost}
      >
        <boxGeometry args={[0.7, 0.066, 0.7]} />
      </mesh>
      {posts.map(([x, z]) => (
        <mesh
          key={`${x}:${z}`}
          position={[x, 0.296, z]}
          material={woodMaterial}
          castShadow={!ghost}
          receiveShadow={!ghost}
        >
          <boxGeometry args={[0.055, 0.46, 0.055]} />
        </mesh>
      ))}
      <mesh position={[0, 0.285, 0]} material={paperMaterial}>
        <boxGeometry args={[0.46, 0.39, 0.46]} />
      </mesh>
      <mesh
        position={[0, 0.5535, 0]}
        material={woodMaterial}
        castShadow={!ghost}
        receiveShadow={!ghost}
      >
        <boxGeometry args={[0.68, 0.055, 0.68]} />
      </mesh>
      <mesh
        position={[0, 0.603, 0]}
        material={woodMaterial}
        castShadow={!ghost}
        receiveShadow={!ghost}
      >
        <boxGeometry args={[0.54, 0.044, 0.54]} />
      </mesh>
    </group>
  );
}

function makePineTierGeometry(
  baseRadius: number,
  height: number,
  lobes: number,
  phase: number,
  openAmount = 0,
  skirtDepth = 0.06,
): THREE.BufferGeometry {
  const rings = 14;
  const segments = lobes * 12;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const deep = new THREE.Color('#435229');
  const capDeep = new THREE.Color('#3B4922');
  const light = new THREE.Color('#5C6E3B');
  const color = new THREE.Color();

  for (let ring = 0; ring < rings; ring += 1) {
    const t = ring / (rings - 1);
    const bell = Math.pow(Math.max(0, 1 - Math.pow(t, 1.5)), 0.65);
    const cone = Math.pow(Math.max(0, 1 - t), 0.85);
    const profile = bell * (1 - openAmount) + cone * openAmount;
    const radius = 0.035 + (baseRadius - 0.035) * profile;
    for (let segment = 0; segment < segments; segment += 1) {
      const theta = (segment / segments) * Math.PI * 2;
      const lobe = 0.5 + 0.5 * Math.cos(lobes * theta + phase);
      const fold =
        1 -
        0.24 * Math.pow(1 - t, 0.55) * (1 - lobe) +
        0.025 * (1 - t) * Math.cos(2 * lobes * theta + phase * 1.7);
      const r = radius * fold;
      const skirt = -skirtDepth * Math.pow(1 - t, 3) * lobe;
      positions.push(Math.cos(theta) * r, height * t + skirt, Math.sin(theta) * r);
      color.copy(deep).lerp(light, 0.15 + 0.85 * t);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = ring * segments + segment;
      const b = ring * segments + next;
      const c = (ring + 1) * segments + segment;
      const d = (ring + 1) * segments + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, -0.02, 0);
  colors.push(capDeep.r, capDeep.g, capDeep.b);
  const topCenter = positions.length / 3;
  positions.push(0, height + 0.012, 0);
  colors.push(light.r, light.g, light.b);
  const lastRing = (rings - 1) * segments;
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    indices.push(bottomCenter, next, segment);
    indices.push(lastRing + segment, lastRing + next, topCenter);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function PineTreeModel({ ghost, valid }: { ghost: boolean; valid: boolean }) {
  const tiers = useMemo(
    () => [
      { baseRadius: 0.62, height: 0.72, y: 0.28, lobes: 6, phase: 0.0, openAmount: 0.35, skirtDepth: 0.04, rot: [0, 0, 0] as [number, number, number] },
      { baseRadius: 0.48, height: 0.66, y: 0.82, lobes: 5, phase: 0.0, openAmount: 0, skirtDepth: 0.06, rot: [0, Math.PI / 5, 0] as [number, number, number] },
      { baseRadius: 0.34, height: 0.60, y: 1.30, lobes: 5, phase: 0.0, openAmount: 1, skirtDepth: 0.06, rot: [0, 0, 0] as [number, number, number] },
    ].map((tier) => ({
      ...tier,
      geometry: makePineTierGeometry(tier.baseRadius, tier.height, tier.lobes, tier.phase, tier.openAmount, tier.skirtDepth),
    })),
    [],
  );
  const foliage = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0,
        envMapIntensity: 0.35,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const bark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#734E30',
        roughness: 0.85,
        metalness: 0,
        envMapIntensity: 0.35,
      }),
    [],
  );
  const ghostMaterial = useMemo(
    () =>
      ghost
        ? new THREE.MeshStandardMaterial({
            color: valid ? '#7FCB8B' : '#E27D76',
            emissive: valid ? '#4A9A58' : '#B94840',
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.44,
            roughness: 0.68,
            metalness: 0,
            envMapIntensity: 0.35,
            depthWrite: false,
          })
        : null,
    [ghost, valid],
  );

  useEffect(
    () => () => {
      tiers.forEach((tier) => tier.geometry.dispose());
      foliage.dispose();
      bark.dispose();
      ghostMaterial?.dispose();
    },
    [tiers, foliage, bark, ghostMaterial],
  );

  return (
    <group scale={0.6375}>
      <mesh
        position={[0, 0.275, 0]}
        material={ghostMaterial ?? bark}
        castShadow={!ghost}
        receiveShadow={!ghost}
      >
        <cylinderGeometry args={[0.09, 0.145, 0.55, 12]} />
      </mesh>
      {tiers.map((tier, index) => (
        <mesh
          key={index}
          geometry={tier.geometry}
          material={ghostMaterial ?? foliage}
          position={[0, tier.y, 0]}
          rotation={tier.rot}
          castShadow={!ghost}
          receiveShadow={!ghost}
        />
      ))}
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
            {item.procedural ? (
              item.id === 'pine_tree' ? (
                <PineTreeModel ghost={ghost} valid={valid} />
              ) : (
                <PaperLanternModel ghost={ghost} valid={valid} />
              )
            ) : (
              <ModelContent item={item} ghost={ghost} valid={valid} />
            )}
          </Suspense>
        </ModelErrorBoundary>
      </group>    </group>
  );
}
