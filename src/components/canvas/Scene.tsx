import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, Stars } from '@react-three/drei';
import {
  Bloom,
  EffectComposer,
  N8AO,
  Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useWorldStore } from '../../store/useWorldStore';
import type { ActionResult } from '../../types';
import { Diorama } from './Diorama';

const DAY_BG = '#F3EFE6';
const NIGHT_BG = '#16181D';
const DAY_CAMERA: [number, number, number] = [7.4, 8.4, 9.6];
const CAMERA_TARGET: [number, number, number] = [0, 0.35, 0];

interface WorldCanvasProps {
  resetSignal: number;
  onFeedback: (result: ActionResult, sound: 'place' | 'store' | 'error') => void;
}

function CameraRig({ resetSignal }: { resetSignal: number }) {
  const camera = useThree((state) => state.camera);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    camera.position.set(...DAY_CAMERA);
    camera.lookAt(...CAMERA_TARGET);
    if ('fov' in camera) {
      camera.fov = 32;
      camera.updateProjectionMatrix();
    }
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...CAMERA_TARGET);
      controls.update();
    }
  }, [camera, resetSignal]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={CAMERA_TARGET}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.72}
      zoomSpeed={0.8}
      panSpeed={0.7}
      minDistance={4.5}
      maxDistance={48}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI * 0.475}
      mouseButtons={{
        LEFT: -1 as unknown as THREE.MOUSE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  );
}

const LEAF_COLORS = ['#E7C6A8', '#D9A6A6', '#C9D3A8', '#E3D3A3', '#C8B6D8'];

function DriftingLeaves() {
  const group = useRef<THREE.Group>(null);
  const leaves = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        x: (Math.random() - 0.5) * 13,
        y: Math.random() * 5 + 1.2,
        z: (Math.random() - 0.5) * 11,
        speed: 0.16 + Math.random() * 0.24,
        sway: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        spin: 0.4 + Math.random() * 0.8,
        color: LEAF_COLORS[index % LEAF_COLORS.length],
      })),
    [],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    leaves.forEach((leaf, index) => {
      const mesh = refs.current[index];
      if (!mesh) return;
      leaf.y -= delta * leaf.speed;
      if (leaf.y < -0.4) leaf.y = 6.2;
      mesh.position.set(
        leaf.x + Math.sin(time * leaf.sway + leaf.phase) * 0.55,
        leaf.y,
        leaf.z + Math.cos(time * 0.3 + leaf.phase) * 0.2,
      );
      mesh.rotation.x += delta * leaf.spin;
      mesh.rotation.z += delta * leaf.spin * 0.7;
    });
  });

  return (
    <group ref={group}>
      {leaves.map((leaf, index) => (
        <mesh
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          position={[leaf.x, leaf.y, leaf.z]}
        >
          <planeGeometry args={[0.11, 0.07]} />
          <meshStandardMaterial
            color={leaf.color}
            roughness={0.9}
            metalness={0}
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function NightSky() {
  return (
    <group>
      <Stars
        radius={70}
        depth={45}
        count={1500}
        factor={3.4}
        saturation={0}
        fade
        speed={0.35}
      />
      <mesh position={[-16, 12.5, -24]}>
        <sphereGeometry args={[1.5, 24, 24]} />
        <meshBasicMaterial color="#EDE6D2" toneMapped={false} />
      </mesh>
      <mesh position={[-16, 12.5, -24]}>
        <sphereGeometry args={[2.4, 24, 24]} />
        <meshBasicMaterial
          color="#EDE6D2"
          transparent
          opacity={0.07}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Lights({ day }: { day: boolean }) {
  return (
    <>
      <ambientLight
        intensity={day ? 0.62 : 0.24}
        color={day ? '#FFF8EA' : '#68789F'}
      />
      <hemisphereLight
        args={[day ? '#FFF6E6' : '#3A4566', day ? '#C9B9A6' : '#181B23', day ? 0.95 : 0.5]}
      />
      <directionalLight
        castShadow
        position={day ? [9, 14, 7] : [-8, 11, -6]}
        intensity={day ? 2.35 : 1.15}
        color={day ? '#FFF5E4' : '#AFC4FF'}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={day ? [-7, 8, -9] : [7, 6, 8]}
        intensity={day ? 0.55 : 0.42}
        color={day ? '#FFE9C9' : '#7C93C8'}
      />
    </>
  );
}

function Effects({ day }: { day: boolean }) {
  return (
    <EffectComposer multisampling={4}>
      <N8AO
        aoRadius={1.5}
        distanceFalloff={1.1}
        intensity={day ? 2.1 : 2.6}
        quality="medium"
        halfRes
        screenSpaceRadius={false}
      />
      <Bloom
        luminanceThreshold={1.0}
        luminanceSmoothing={0.2}
        intensity={day ? 0.25 : 1.05}
        mipmapBlur
        radius={0.6}
      />
      <Vignette eskil={false} offset={0.22} darkness={day ? 0.22 : 0.58} />
    </EffectComposer>
  );
}

function Scene({ resetSignal, onFeedback }: WorldCanvasProps) {
  const themeMode = useWorldStore((state) => state.themeMode);
  const day = themeMode === 'day';
  const bg = day ? DAY_BG : NIGHT_BG;

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 34, 110]} />
      <Lights day={day} />
      {day ? <DriftingLeaves /> : <NightSky />}
      <Diorama onFeedback={onFeedback} />
      <Grid
        position={[0, -0.03, 0]}
        args={[10, 10]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={day ? '#D9CDBA' : '#343A46'}
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor={day ? '#BFB29B' : '#4B5568'}
        fadeDistance={30}
        fadeStrength={2}
        infiniteGrid
        followCamera={false}
      />
      <CameraRig resetSignal={resetSignal} />
      <Effects day={day} />
    </>
  );
}

export function WorldCanvas({ resetSignal, onFeedback }: WorldCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: DAY_CAMERA, fov: 32, near: 0.1, far: 160 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      className="h-full w-full"
    >
      <Suspense fallback={null}>
        <Scene resetSignal={resetSignal} onFeedback={onFeedback} />
      </Suspense>
    </Canvas>
  );
}
