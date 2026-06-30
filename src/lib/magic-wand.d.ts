declare module 'magic-wand-js' {
  interface MagicWandMask {
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

  interface MagicWandOptions {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    px: number;
    py: number;
    tolerance: number;
  }

  function floodFill(
    imageData: { data: Uint8ClampedArray; width: number; height: number },
    px: number,
    py: number,
    tolerance: number,
    mask?: Uint8Array | null,
    isMask?: boolean
  ): MagicWandMask;

  function gaussBlurOnlyBorder(
    mask: MagicWandMask,
    blurRadius: number
  ): MagicWandMask;

  function traceContours(mask: MagicWandMask): Array<{
    inner: boolean;
    label: number;
    points: Array<{ x: number; y: number }>;
  }>;

  function simplifyContours(
    contours: Array<{ points: Array<{ x: number; y: number }> }>,
    tolerance: number,
    highQuality: boolean
  ): Array<{ points: Array<{ x: number; y: number }> }>;
}
