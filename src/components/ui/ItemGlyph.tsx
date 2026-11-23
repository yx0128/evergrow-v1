import {
  Armchair,
  Droplets,
  Flame,
  Flower2,
  Grid2X2,
  Home,
  Lamp,
  Layers,
  Sparkles,
  Sprout,
  Square,
  Store,
  TreeDeciduous,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { ItemDef } from '../../types';
import { vibrantColor } from '../../lib/color';

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
  deciduous: TreeDeciduous,
  store: Store,
  home: Home,
  bench: Armchair,
};

export function ItemGlyph({
  item,
  size = 20,
  className,
  vibrant = false,
}: {
  item: ItemDef;
  size?: number;
  className?: string;
  vibrant?: boolean;
}) {
  const Icon = GLYPHS[item.glyph] ?? Sparkles;
  return (
    <Icon
      size={size}
      className={className}
      style={{ color: vibrant ? vibrantColor(item.accent) : item.accent }}
    />
  );
}
