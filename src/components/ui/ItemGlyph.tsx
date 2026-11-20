import {
  Armchair,
  Droplets,
  Flame,
  Flower2,
  Grid2X2,
  Lamp,
  Layers,
  Sparkles,
  Sprout,
  Square,
  Store,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { ItemDef } from '../../types';

const GLYPHS: Record<string, LucideIcon> = {
  square: Square,
  grid: Grid2X2,
  sprout: Sprout,
  droplets: Droplets,
  stairs: Layers,
  lamp: Lamp,
  waves: Waves,
  columns: Layers,
  flame: Flame,
  flower: Flower2,
  tree: TreePine,
  store: Store,
  bench: Armchair,
};

export function ItemGlyph({
  item,
  size = 20,
  className,
}: {
  item: ItemDef;
  size?: number;
  className?: string;
}) {
  const Icon = GLYPHS[item.glyph] ?? Sparkles;
  return <Icon size={size} className={className} style={{ color: item.accent }} />;
}
