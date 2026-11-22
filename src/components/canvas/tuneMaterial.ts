import * as THREE from 'three';

export function tuneMaterial<T extends THREE.Material>(material: T): T {
  const standard = material as unknown as THREE.MeshStandardMaterial;
  if (!standard.isMeshStandardMaterial) return material;
  standard.envMapIntensity = 0.35;
  const physical = standard as unknown as THREE.MeshPhysicalMaterial;
  if ('specularIntensity' in physical) {
    physical.specularIntensity = 0.25;
  }
  return material;
}
