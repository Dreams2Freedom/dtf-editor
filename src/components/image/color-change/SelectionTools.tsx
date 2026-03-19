'use client';

// @ts-ignore — vendored JS module (magic-wand-js has no ESM/CJS exports)
import MagicWand from '@/lib/magic-wand';
import { SelectionMask } from '@/types/colorChange';
import { pointInPolygon } from '@/lib/color-utils';

export function clickSelect(
  imageData: ImageData,
  x: number,
  y: number,
  tolerance: number
): SelectionMask {
  const result = MagicWand.floodFill(
    { data: imageData.data, width: imageData.width, height: imageData.height },
    x,
    y,
    tolerance
  );

  return {
    data: result.data,
    width: result.width,
    height: result.height,
    bounds: result.bounds,
  };
}

export function lassoSelect(
  imageData: ImageData,
  x: number,
  y: number,
  tolerance: number,
  polygon: Array<{ x: number; y: number }>
): SelectionMask {
  const fullMask = clickSelect(imageData, x, y, tolerance);

  const constrainedData = new Uint8Array(fullMask.data.length);
  let minX = fullMask.width, minY = fullMask.height, maxX = 0, maxY = 0;

  for (let py = fullMask.bounds.minY; py <= fullMask.bounds.maxY; py++) {
    for (let px = fullMask.bounds.minX; px <= fullMask.bounds.maxX; px++) {
      const idx = py * fullMask.width + px;
      if (fullMask.data[idx] === 1 && pointInPolygon(px, py, polygon)) {
        constrainedData[idx] = 1;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    }
  }

  if (maxX < minX) {
    minX = 0; minY = 0; maxX = 0; maxY = 0;
  }

  return {
    data: constrainedData,
    width: fullMask.width,
    height: fullMask.height,
    bounds: { minX, minY, maxX, maxY },
  };
}

export function createSelectionOverlay(
  mask: SelectionMask,
  width: number,
  height: number
): ImageData {
  const overlay = new ImageData(width, height);
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] === 1) {
      const idx = i * 4;
      overlay.data[idx] = 59;
      overlay.data[idx + 1] = 130;
      overlay.data[idx + 2] = 246;
      overlay.data[idx + 3] = 80;
    }
  }
  return overlay;
}
