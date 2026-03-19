export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface SelectionMask {
  data: Uint8Array;
  width: number;
  height: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface ColorChangeEntry {
  id: string;
  mask: SelectionMask;
  sourceColor: RGBColor;
  targetColor: RGBColor;
  originalPixels: Uint8ClampedArray;
}

export type SelectionMode = 'click' | 'lasso';

export interface ColorChangeState {
  selectionMode: SelectionMode;
  tolerance: number;
  currentMask: SelectionMask | null;
  sourceColor: RGBColor | null;
  targetColor: string;
}

// Note: User.subscriptionStatus has no 'pro' yet ('free'|'basic'|'starter'|'cancelled').
// 'pro' included for forward compatibility. Falls back to 'free' limit if no match.
export const COLOR_CHANGE_LIMITS: Record<string, number> = {
  free: 5,
  cancelled: 5,
  basic: 25,
  starter: 25,
  pro: 50,
};
