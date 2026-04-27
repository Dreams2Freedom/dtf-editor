import type {
  BgDetectionResult,
  BgRemovalModel,
  RemovalOptions,
  SamPoint,
  SamSession,
} from '@/types/backgroundRemoval';

export interface RemoveResult {
  blob: Blob;
  url: string;
}

function rgbToString(rgb: [number, number, number]): string {
  return `${rgb[0]},${rgb[1]},${rgb[2]}`;
}

/**
 * Sample border pixels and classify the background.
 * Returns the dominant color, optional secondary, variance, and recommended mode.
 */
export async function detectBackground(imageBlob: Blob): Promise<BgDetectionResult> {
  const form = new FormData();
  form.append('image', imageBlob, 'image.png');

  const res = await fetch('/api/background-removal/detect', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Detection failed (${res.status})`);
  }

  return res.json() as Promise<BgDetectionResult>;
}

/**
 * Background removal supporting multiple modes (color-fill, ml-only, etc.).
 */
export async function removeBackground(
  imageBlob: Blob,
  options: RemovalOptions
): Promise<RemoveResult> {
  const form = new FormData();
  form.append('image', imageBlob, 'image.png');
  form.append('mode', options.mode);
  if (options.model) form.append('model', options.model);
  if (options.targetColor) form.append('target_color', rgbToString(options.targetColor));
  if (typeof options.tolerance === 'number')
    form.append('tolerance', String(options.tolerance));
  if (options.seedPoints && options.seedPoints.length > 0) {
    form.append('seed_points', JSON.stringify(options.seedPoints));
  }

  const res = await fetch('/api/background-removal/in-house', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Background removal failed (${res.status})`);
  }

  const blob = await res.blob();
  return { blob, url: URL.createObjectURL(blob) };
}

/**
 * Backwards-compatible single-arg signature: pass just a model to use ml+color.
 * Used by the old SAM/embed callsites; new callers should pass RemovalOptions.
 */
export async function removeBackgroundLegacy(
  imageBlob: Blob,
  model: BgRemovalModel = 'birefnet-general-lite'
): Promise<RemoveResult> {
  return removeBackground(imageBlob, {
    mode: model === 'white-fill' ? 'color-fill' : 'ml+color',
    model: model === 'white-fill' ? undefined : model,
    targetColor: model === 'white-fill' ? [255, 255, 255] : undefined,
    tolerance: model === 'white-fill' ? 30 : undefined,
  });
}

export async function embedImage(imageBlob: Blob): Promise<SamSession> {
  const form = new FormData();
  form.append('image', imageBlob, 'image.png');

  const res = await fetch('/api/background-removal/embed', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Embedding failed (${res.status})`);
  }

  return res.json() as Promise<SamSession>;
}

export async function predictMask(
  session: SamSession,
  points: SamPoint[]
): Promise<RemoveResult> {
  const form = new FormData();
  form.append('embedding_id', session.embeddingId);
  form.append('points', JSON.stringify(points));

  const res = await fetch('/api/background-removal/predict', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Prediction failed (${res.status})`);
  }

  const blob = await res.blob();
  return { blob, url: URL.createObjectURL(blob) };
}
