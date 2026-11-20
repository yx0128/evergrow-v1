import { lazy, Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useWorldStore } from '../../store/useWorldStore';
import type { ActionResult, GraphicsQuality } from '../../types';
import { LightingPool } from './LightingPool';
import { Diorama } from './Diorama';

const DAY_BG = '#F3EFE6';
const NIGHT_BG = '#16181D';
const DAY_CAMERA: [number, number, number] = [7.4, 8.4, 9.6];
const CAMERA_TARGET: [number, number, number] = [0, 0.35, 0];

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
        intensity={day ? 0.62 : 0.24}
        color={day ? '#FFF8EA' : '#68789F'}
      />
      <hemisphereLight
        args={[day ? '#FFF6E6' : '#3A4566', day ? '#C9B9A6' : '#181B23', day ? 0.95 : 0.5]}
      />
      <directionalLight
        ref={sunRef}
        castShadow
        position={day ? [9, 14, 7] : [-8, 11, -6]}
        intensity={day ? 2.35 : 1.15}
        color={day ? '#FFF5E4' : '#AFC4FF'}
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
        intensity={day ? 0.55 : 0.42}
        color={day ? '#FFE9C9' : '#7C93C8'}
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
      <fog attach="fog" args={[bg, 34, 110]} />
      <Lights day={day} shadowSize={highQuality ? 2048 : 1024} />
      {!day && <NightSky />}
      <Diorama onFeedback={onFeedback} />
      <LightingPool />
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
