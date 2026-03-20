import { RGBColor, HSLColor, SelectionMask } from '@/types/colorChange';

export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): RGBColor {
  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function hexToRgb(hex: string): RGBColor {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

export function rgbToHex(color: RGBColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function applyColorShift(
  imageData: ImageData,
  mask: SelectionMask,
  sourceColor: RGBColor,
  targetColor: RGBColor
): Uint8ClampedArray {
  const { data, width } = imageData;
  const { bounds } = mask;

  // Perceived luminance (Rec. 709)
  const lum = (r: number, g: number, b: number) =>
    (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const srcHsl = rgbToHsl(sourceColor.r, sourceColor.g, sourceColor.b);
  const tgtHsl = rgbToHsl(targetColor.r, targetColor.g, targetColor.b);
  const srcLum = lum(sourceColor.r, sourceColor.g, sourceColor.b);
  const tgtLum = lum(targetColor.r, targetColor.g, targetColor.b);

  // Classify source and target
  const srcIsAchromatic = srcHsl.s < 10 || srcHsl.l < 5 || srcHsl.l > 95;
  const tgtIsAchromatic = tgtHsl.s < 10 || tgtHsl.l < 5 || tgtHsl.l > 95;

  const boundsWidth = bounds.maxX - bounds.minX + 1;
  const boundsHeight = bounds.maxY - bounds.minY + 1;
  const originalPixels = new Uint8ClampedArray(boundsWidth * boundsHeight * 4);

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const maskIdx = y * mask.width + x;
      const imgIdx = (y * width + x) * 4;
      const origIdx = ((y - bounds.minY) * boundsWidth + (x - bounds.minX)) * 4;

      // Backup original pixel
      originalPixels[origIdx] = data[imgIdx];
      originalPixels[origIdx + 1] = data[imgIdx + 1];
      originalPixels[origIdx + 2] = data[imgIdx + 2];
      originalPixels[origIdx + 3] = data[imgIdx + 3];

      if (mask.data[maskIdx] !== 1) continue;
      if (data[imgIdx + 3] === 0) continue;

      const pR = data[imgIdx], pG = data[imgIdx + 1], pB = data[imgIdx + 2];
      const pixLum = lum(pR, pG, pB);

      if (!srcIsAchromatic && !tgtIsAchromatic) {
        // CASE 1: Chromatic → Chromatic (standard HSL hue shift)
        const pixHsl = rgbToHsl(pR, pG, pB);
        let newH = (pixHsl.h + (tgtHsl.h - srcHsl.h)) % 360;
        if (newH < 0) newH += 360;
        const newS = Math.max(0, Math.min(100, pixHsl.s + (tgtHsl.s - srcHsl.s)));
        const newRgb = hslToRgb(newH, newS, pixHsl.l);
        data[imgIdx] = newRgb.r;
        data[imgIdx + 1] = newRgb.g;
        data[imgIdx + 2] = newRgb.b;

      } else if (srcIsAchromatic && !tgtIsAchromatic) {
        // CASE 2: Achromatic → Chromatic (black→red, white→blue, gray→green)
        // Colorize: apply target hue/sat, map luminance structure
        // Compute intensity: how strongly this pixel matches the source
        let intensity: number;
        if (srcLum < 0.5) {
          // Dark source: darker pixels = stronger match
          intensity = 1.0 - pixLum;
        } else {
          // Light source: brighter pixels = stronger match
          intensity = pixLum;
        }
        // Map to target color with intensity controlling the blend
        const outL = lerp(pixLum * 100, tgtHsl.l, intensity);
        const outS = tgtHsl.s * intensity;
        const newRgb = hslToRgb(tgtHsl.h, outS, Math.max(0, Math.min(100, outL)));
        data[imgIdx] = newRgb.r;
        data[imgIdx + 1] = newRgb.g;
        data[imgIdx + 2] = newRgb.b;

      } else if (!srcIsAchromatic && tgtIsAchromatic) {
        // CASE 3: Chromatic → Achromatic (red→black, blue→white)
        // Desaturate toward target luminance
        const pixHsl = rgbToHsl(pR, pG, pB);
        // How chromatic is this pixel relative to the source
        const chromaMatch = Math.min(1, pixHsl.s / Math.max(srcHsl.s, 1));
        const outL = lerp(pixHsl.l, tgtHsl.l, chromaMatch);
        const outS = pixHsl.s * (1 - chromaMatch);
        const newRgb = hslToRgb(pixHsl.h, outS, Math.max(0, Math.min(100, outL)));
        data[imgIdx] = newRgb.r;
        data[imgIdx + 1] = newRgb.g;
        data[imgIdx + 2] = newRgb.b;

      } else {
        // CASE 4: Achromatic → Achromatic (black→white, white→black, white→gray, etc.)
        // Direct replacement: set pixel to target color.
        // Anti-aliasing is handled by the selection mask — edge pixels won't be
        // selected at low tolerance, so we don't need to blend here.
        data[imgIdx] = targetColor.r;
        data[imgIdx + 1] = targetColor.g;
        data[imgIdx + 2] = targetColor.b;

      }
    }
  }

  return originalPixels;
}

export function restorePixels(
  imageData: ImageData,
  mask: SelectionMask,
  originalPixels: Uint8ClampedArray
): void {
  const { data, width } = imageData;
  const { bounds } = mask;
  const boundsWidth = bounds.maxX - bounds.minX + 1;

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const imgIdx = (y * width + x) * 4;
      const origIdx = ((y - bounds.minY) * boundsWidth + (x - bounds.minX)) * 4;

      data[imgIdx] = originalPixels[origIdx];
      data[imgIdx + 1] = originalPixels[origIdx + 1];
      data[imgIdx + 2] = originalPixels[origIdx + 2];
      data[imgIdx + 3] = originalPixels[origIdx + 3];
    }
  }
}

export function getPixelColor(
  imageData: ImageData,
  x: number,
  y: number
): RGBColor {
  const idx = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
  };
}

export function pointInPolygon(
  x: number,
  y: number,
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
