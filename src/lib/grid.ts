import { BASE_HEIGHT } from '../data/items';
import type { PlacedItem } from '../types';

export const cellKey = (x: number, z: number): string => `${x}:${z}`;

const BASE_IDS = new Set([
  'sandstone_tile',
  'slate_tile',
  'grass_tile',
  'water_basin',
  'stone_stairs',
]);

export function isBasePiece(piece: PlacedItem): boolean {
  return BASE_IDS.has(piece.itemId);
}

export function findBase(
  placed: PlacedItem[],
  x: number,
  z: number,
): PlacedItem | undefined {
  return placed.find((piece) => piece.x === x && piece.z === z && isBasePiece(piece));
}

export function findProp(
  placed: PlacedItem[],
  x: number,
  z: number,
): PlacedItem | undefined {
  return placed.find((piece) => piece.x === x && piece.z === z && !isBasePiece(piece));
}

export function propHeight(): number {
  return BASE_HEIGHT;
}

export function rotationToRadians(rotation: number): number {
  return (rotation % 4) * (Math.PI / 2);
}

export function clampCell(value: number): number {
  return Math.max(-250, Math.min(250, Math.round(value)));
}

export function worldToCell(worldX: number, worldZ: number): { x: number; z: number } {
  return { x: clampCell(worldX), z: clampCell(worldZ) };
}
