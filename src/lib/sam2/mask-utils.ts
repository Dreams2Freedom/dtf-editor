'use client';

/**
 * Client-side mask utilities for the SAM2 background removal editor.
 */

/**
 * Apply a binary mask to an image canvas for preview rendering.
 * Shows the original image where mask alpha=255, checkerboard where mask alpha=0.
 */
export function renderMaskedPreview(
  originalCanvas: HTMLCanvasElement,
  mask: ImageData,
  outputCanvas: HTMLCanvasElement
): void {
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = outputCanvas;

  // Draw the original image first
  ctx.drawImage(originalCanvas, 0, 0, width, height);

  // Get the pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const maskPixels = mask.data;

  // Apply mask: set alpha to 0 where mask says background
  for (let i = 0; i < pixels.length; i += 4) {
    const maskIdx = i; // mask and image are same size
    if (maskIdx < maskPixels.length) {
      // Use mask alpha channel (255=keep, 0=remove)
      pixels[i + 3] = maskPixels[maskIdx + 3];
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Render the mask overlay on the original image canvas.
 * Shows a semi-transparent red tint over areas to be removed.
 */
export function renderMaskOverlay(
  ctx: CanvasRenderingContext2D,
  mask: ImageData,
  width: number,
  height: number
): void {
  // Create a temporary canvas for the overlay
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  const overlayCtx = overlayCanvas.getContext('2d');
  if (!overlayCtx) return;

  const overlay = overlayCtx.createImageData(width, height);
  const overlayPixels = overlay.data;
  const maskPixels = mask.data;

  for (let i = 0; i < overlayPixels.length; i += 4) {
    if (i < maskPixels.length && maskPixels[i + 3] === 0) {
      // Background area: red tint
      overlayPixels[i] = 255; // R
      overlayPixels[i + 1] = 0; // G
      overlayPixels[i + 2] = 0; // B
      overlayPixels[i + 3] = 80; // Alpha (semi-transparent)
    }
    // Foreground areas: fully transparent (no overlay)
  }

  overlayCtx.putImageData(overlay, 0, 0);
  ctx.drawImage(overlayCanvas, 0, 0);
}

/**
 * Serialize a mask ImageData to a compact Uint8Array (1 byte per pixel alpha).
 * Used to send the mask to the server for final processing.
 */
export function serializeMask(mask: ImageData): Uint8Array {
  const { width, height, data } = mask;
  const serialized = new Uint8Array(width * height);

  for (let i = 0; i < serialized.length; i++) {
    // Extract alpha channel (every 4th byte)
    serialized[i] = data[i * 4 + 3];
  }

  return serialized;
}

/**
 * Convert serialized mask to base64 string for API transfer.
 */
export function maskToBase64(mask: ImageData): string {
  const serialized = serializeMask(mask);
  let binary = '';
  for (let i = 0; i < serialized.length; i++) {
    binary += String.fromCharCode(serialized[i]);
  }
  return btoa(binary);
}

/**
 * Apply client-side feathering (Gaussian blur approximation) to the mask.
 * Uses box blur repeated 3 times for a Gaussian approximation.
 */
export function featherMask(mask: ImageData, radius: number): ImageData {
  if (radius <= 0) return mask;

  const { width, height } = mask;
  const result = new ImageData(width, height);

  // Extract alpha channel
  const alphaIn = new Float32Array(width * height);
  for (let i = 0; i < alphaIn.length; i++) {
    alphaIn[i] = mask.data[i * 4 + 3];
  }

  // Box blur the alpha channel 3 times for Gaussian approximation
  let current = alphaIn;
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += current[ny * width + nx];
              count++;
            }
          }
        }

        next[y * width + x] = sum / count;
      }
    }

    current = next;
  }

  // Write back to ImageData
  for (let i = 0; i < current.length; i++) {
    const idx = i * 4;
    result.data[idx] = 255; // R
    result.data[idx + 1] = 255; // G
    result.data[idx + 2] = 255; // B
    result.data[idx + 3] = Math.round(current[i]); // A
  }

  return result;
}

/**
 * Draw a checkerboard pattern (for transparent background preview).
 */
export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number = 10
): void {
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isLight = (x / cellSize + y / cellSize) % 2 === 0;
      ctx.fillStyle = isLight ? '#ffffff' : '#cccccc';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}
