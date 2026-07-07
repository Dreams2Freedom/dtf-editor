// Type declarations for the vendored magic-wand implementation in
// ./magic-wand.js. Imported as a default export: `import MagicWand from '@/lib/magic-wand'`.

export interface MagicWandMask {
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

export interface MagicWandOptions {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  px: number;
  py: number;
  tolerance: number;
}

export interface MagicWand {
  floodFill(
    imageData: {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      bytes?: number;
    },
    px: number,
    py: number,
    tolerance: number,
    mask?: Uint8Array | null,
    isMask?: boolean
  ): MagicWandMask;

  gaussBlurOnlyBorder(mask: MagicWandMask, blurRadius: number): MagicWandMask;

  traceContours(mask: MagicWandMask): Array<{
    inner: boolean;
    label: number;
    points: Array<{ x: number; y: number }>;
  }>;

  simplifyContours(
    contours: Array<{ points: Array<{ x: number; y: number }> }>,
    tolerance: number,
    highQuality: boolean
  ): Array<{ points: Array<{ x: number; y: number }> }>;
}

declare const MagicWand: MagicWand;
export default MagicWand;
