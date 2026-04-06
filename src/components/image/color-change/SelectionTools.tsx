'use client';

// @ts-expect-error — vendored JS module without TypeScript declarations
import MagicWand from '@/lib/magic-wand';
import { SelectionMask } from '@/types/colorChange';
import { pointInPolygon } from '@/lib/color-utils';

/**
 * Global color select: selects ALL pixels in the image that match the clicked
 * pixel's color within tolerance, regardless of whether they're connected.
 * This is like Photoshop's "Select > Color Range" — much more useful for DTF
 * designs where the same color appears in multiple disconnected areas.
 */
export function clickSelect(
  imageData: ImageData,
  x: number,
  y: number,
  tolerance: number
): SelectionMask {
  const { data, width, height } = imageData;
  const idx = (y * width + x) * 4;
  const sampleR = data[idx];
  const sampleG = data[idx + 1];
  const sampleB = data[idx + 2];

  const mask = new Uint8Array(width * height);
  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      // Skip fully transparent pixels
      if (data[i + 3] === 0) continue;

      const dr = Math.abs(data[i] - sampleR);
      const dg = Math.abs(data[i + 1] - sampleG);
      const db = Math.abs(data[i + 2] - sampleB);

      if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
        mask[py * width + px] = 1;
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

  return { data: mask, width, height, bounds: { minX, minY, maxX, maxY } };
}

/**
 * Connected flood fill select (magic wand) — only selects connected pixels.
 * Used internally by lassoSelect for constrained selection.
 */
export function floodFillSelect(
  imageData: ImageData,
  x: number,
  y: number,
  tolerance: number
): SelectionMask {
  const result = MagicWand.floodFill(
    { data: imageData.data, width: imageData.width, height: imageData.height, bytes: 4 },
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

/**
 * Lasso-constrained color select: selects all pixels matching the clicked
 * color within tolerance, BUT only inside the lasso polygon boundary.
 * This solves the "same green in roses AND background" problem.
 */
export function lassoSelect(
  imageData: ImageData,
  x: number,
  y: number,
  tolerance: number,
  polygon: Array<{ x: number; y: number }>
): SelectionMask {
  // Global color match first
  const fullMask = clickSelect(imageData, x, y, tolerance);

  // Then restrict to inside the lasso polygon
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
      overlay.data[idx] = 59;      // R
      overlay.data[idx + 1] = 130;  // G
      overlay.data[idx + 2] = 246;  // B
      overlay.data[idx + 3] = 150;  // Alpha — strong enough to be clearly visible
    }
  }
  return overlay;
}

/** Count number of selected pixels in a mask */
export function countSelectedPixels(mask: SelectionMask): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] === 1) count++;
  }
  return count;
}
