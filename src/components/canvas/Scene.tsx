import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { BASE_HEIGHT } from '../../data/items';
import { useWorldStore } from '../../store/useWorldStore';
import type { ActionResult, GraphicsQuality } from '../../types';
import { LightingPool } from './LightingPool';
import { Diorama } from './Diorama';

const DAY_BG = '#F3EFE6';
const NIGHT_BG = '#221F1D';
const DAY_CAMERA: [number, number, number] = [7.4, 8.4, 9.6];
const CAMERA_TARGET: [number, number, number] = [0, BASE_HEIGHT, 0];

const Effects = lazy(() => import('./Effects'));

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

const STAR_COUNT = 200;

function NightSky() {
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 252, 240, 1)');
      gradient.addColorStop(0.25, 'rgba(255, 248, 230, 0.45)');
      gradient.addColorStop(0.55, 'rgba(255, 248, 230, 0.08)');
      gradient.addColorStop(1, 'rgba(255, 248, 230, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);
  const starColor = useMemo(() => new THREE.Color(1.25, 1.2, 1.1), []);

  useEffect(() => () => starTexture.dispose(), [starTexture]);

  const starPositions = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    let seed = 7;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let index = 0; index < STAR_COUNT; index += 1) {
      const radius = 45 + next() * 45;
      const y = next() * 90 - 45;
      const angle = next() * Math.PI * 2;
      const horizontal = Math.sqrt(Math.max(radius * radius - y * y, 1));
      positions[index * 3] = Math.cos(angle) * horizontal;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(angle) * horizontal;
    }
    return positions;
  }, []);

  return (
    <points position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={starTexture}
        color={starColor}
        size={0.8}
        sizeAttenuation={true}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthTest
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </points>
  );
}

function DprController({ quality }: { quality: GraphicsQuality }) {
  const setDpr = useThree((state) => state.setDpr);
  useEffect(() => {
    setDpr(quality === 'high' ? [1, 1.75] : [1, 1.25]);
  }, [quality, setDpr]);
  return null;
}

function Lights({ day, shadowSize }: { day: boolean; shadowSize: number }) {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const light = sunRef.current;
    if (!light) return;
    light.shadow.mapSize.set(shadowSize, shadowSize);
    light.shadow.map?.dispose();
    light.shadow.map = null;
    light.shadow.needsUpdate = true;
  }, [shadowSize]);

  return (
    <>
      <ambientLight
        intensity={day ? 0.62 : 0.25}
        color={day ? '#FFF8EA' : '#6B655D'}
      />
      <hemisphereLight
        args={[day ? '#FFF6E6' : '#6E6A63', day ? '#C9B9A6' : '#2E2A25', day ? 0.95 : 0.85]}
      />
      <directionalLight
        ref={sunRef}
        castShadow
        position={day ? [9, 14, 7] : [-8, 11, -6]}
        intensity={day ? 2.35 : 0.45}
        color={day ? '#FFF5E4' : '#9E9B94'}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
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
        intensity={day ? 0.55 : 0.22}
        color={day ? '#FFE9C9' : '#7A746C'}
      />
    </>
  );
}

function Scene({ resetSignal, onFeedback }: WorldCanvasProps) {
  const themeMode = useWorldStore((state) => state.themeMode);
  const graphicsQuality = useWorldStore((state) => state.graphicsQuality);
  const day = themeMode === 'day';
  const highQuality = graphicsQuality === 'high';
  const bg = day ? DAY_BG : NIGHT_BG;

  return (
    <>
      <fog attach="fog" args={[bg, day ? 80 : 34, day ? 220 : 110]} />
      <Lights day={day} shadowSize={highQuality ? 2048 : 1024} />
      {!day && <NightSky />}
      <Diorama onFeedback={onFeedback} />
      <LightingPool />
      <Grid
        position={[0, -0.03, 0]}
        args={[10, 10]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={day ? '#D9CDBA' : '#3B352F'}
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor={day ? '#BFB29B' : '#574D42'}
        fadeDistance={30}
        fadeStrength={2}
        infiniteGrid
        followCamera={false}
      />
      <CameraRig resetSignal={resetSignal} />
      <DprController quality={graphicsQuality} />
      {highQuality ? (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      ) : null}
    </>
  );
}

export function WorldCanvas({ resetSignal, onFeedback }: WorldCanvasProps) {
  const graphicsQuality = useWorldStore((state) => state.graphicsQuality);

  return (
    <Canvas
      shadows
      dpr={graphicsQuality === 'high' ? [1, 1.75] : [1, 1.25]}
      camera={{ position: DAY_CAMERA, fov: 32, near: 0.1, far: 160 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
      }}
      className="h-full w-full"
    >
      <Suspense fallback={null}>
        <Scene resetSignal={resetSignal} onFeedback={onFeedback} />
      </Suspense>
    </Canvas>
  );
}
