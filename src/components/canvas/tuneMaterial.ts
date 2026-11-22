import * as THREE from 'three';

export function tuneMaterial<T extends THREE.Material>(material: T): T {
  const standard = material as unknown as THREE.MeshStandardMaterial;
  if (!standard.isMeshStandardMaterial) return material;
  if (standard.name === 'water_surface') {
    return new THREE.MeshPhysicalMaterial({
      name: 'water_surface',
      color: standard.color.clone(),
      roughness: 0.2,
      metalness: 0.02,
      reflectivity: 0.4,
      clearcoat: 0.12,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: 0.65,
      envMapIntensity: 0.25,
      side: standard.side,
    }) as unknown as T;
  }
  if (standard.name === 'fountain_water') {
    return new THREE.MeshPhysicalMaterial({
      name: 'fountain_water',
      color: standard.color.clone().offsetHSL(0, 0, 0.07),
      roughness: 0.24,
      metalness: 0.02,
      reflectivity: 0.4,
      clearcoat: 0,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.6,
      envMapIntensity: 0.12,
      side: standard.side,
    }) as unknown as T;
  }
  standard.envMapIntensity = 0.35;
  const physical = standard as unknown as THREE.MeshPhysicalMaterial;
  if ('specularIntensity' in physical) {
    physical.specularIntensity = 0.25;
  }
  return material;
}
