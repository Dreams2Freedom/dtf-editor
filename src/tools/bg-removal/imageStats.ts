/**
 * Lightweight client-side image classifier for the BG Removal tool.
 *
 * Decides "graphic" (logo, sticker, vector-style illustration) vs
 * "photo" (continuous-tone photograph) so the panel can auto-pick the
 * `birefnet-dis` model — labeled "High Detail (Graphics + Text)" — for
 * graphics-y inputs. Photos keep the default `bria-rmbg`.
 *
 * Cheap heuristic, runs in <10 ms on a 256×256 downsample:
 *   - Unique-color count (after 5-bit quantization). Graphics use a
 *     limited palette; photos use thousands of subtle shades.
 *   - Hard-edge ratio. Graphics have crisp pixel-step transitions;
 *     photos have soft, gradient-ish neighbors.
 *
 * Both signals must agree to classify "graphic" — guards against
 * false-positives on flat-color photos (e.g., studio portraits).
 */

const CLASSIFY_SIZE = 256;
const QUANT_BITS = 3; // 5-bit quantization → 32 levels per channel
const QUANT_SHIFT = 8 - QUANT_BITS;
const UNIQUE_GRAPHIC_MAX = 600;
const HARD_EDGE_THRESHOLD = 50; // luminance delta
const HARD_EDGE_RATIO_MIN = 0.1;
const SAMPLE_COUNT = 2000;

export type ImageClass = 'graphic' | 'photo';

export function classifyImage(image: HTMLImageElement): ImageClass {
  const canvas = document.createElement('canvas');
  const w = (canvas.width = CLASSIFY_SIZE);
  const h = (canvas.height = CLASSIFY_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'photo';
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Unique-color count via 5-bit quantization.
  const seen = new Set<number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4;
      const r = data[j] >> QUANT_SHIFT;
      const g = data[j + 1] >> QUANT_SHIFT;
      const b = data[j + 2] >> QUANT_SHIFT;
      seen.add((r << 10) | (g << 5) | b);
      if (seen.size > UNIQUE_GRAPHIC_MAX * 4) break; // early-out, definitely a photo
    }
  }

  const uniqueColors = seen.size;

  // Hard-edge ratio: random sample, compare luminance to right + bottom neighbour.
  let hardEdges = 0;
  let sampled = 0;
  for (let n = 0; n < SAMPLE_COUNT; n++) {
    const x = (Math.random() * (w - 1)) | 0;
    const y = (Math.random() * (h - 1)) | 0;
    const j = (y * w + x) * 4;
    const lum = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    const jR = j + 4;
    const jD = j + w * 4;
    const lumR = data[jR] * 0.299 + data[jR + 1] * 0.587 + data[jR + 2] * 0.114;
    const lumD = data[jD] * 0.299 + data[jD + 1] * 0.587 + data[jD + 2] * 0.114;
    if (
      Math.abs(lum - lumR) >= HARD_EDGE_THRESHOLD ||
      Math.abs(lum - lumD) >= HARD_EDGE_THRESHOLD
    ) {
      hardEdges++;
    }
    sampled++;
  }
  const hardEdgeRatio = sampled > 0 ? hardEdges / sampled : 0;

  if (
    uniqueColors < UNIQUE_GRAPHIC_MAX &&
    hardEdgeRatio > HARD_EDGE_RATIO_MIN
  ) {
    return 'graphic';
  }
  return 'photo';
}
