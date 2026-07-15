import { createClientSupabaseClient } from '@/lib/supabase/client';
import type {
  BgDetectionResult,
  BgRemovalModel,
  RemovalOptions,
  SamPoint,
  SamSession,
} from './types';

export interface RemoveResult {
  blob: Blob;
  url: string;
}

function rgbToString(rgb: [number, number, number]): string {
  return `${rgb[0]},${rgb[1]},${rgb[2]}`;
}

/**
 * Upload the full-resolution image straight to Supabase Storage from the
 * browser and return its public URL + storage path. The API routes then fetch
 * it server-side, so large designs bypass Vercel's ~4.5MB serverless
 * request-body limit (which otherwise 413s). Mirrors the ClippingMagic path.
 */
async function stageImage(
  imageBlob: Blob
): Promise<{ url: string; path: string }> {
  const supabase = createClientSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error('Please sign in to remove backgrounds.');
  }

  const path = `${user.id}/studio-inhouse/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.png`;

  const { error: uploadErr } = await supabase.storage
    .from('images')
    .upload(path, imageBlob, { contentType: 'image/png', upsert: true });
  if (uploadErr) {
    throw new Error(`Couldn't stage image: ${uploadErr.message}`);
  }

  const { data: pub } = supabase.storage.from('images').getPublicUrl(path);
  if (!pub?.publicUrl) {
    throw new Error('Could not resolve staged image URL');
  }
  return { url: pub.publicUrl, path };
}

/**
 * Sample border pixels and classify the background.
 * Returns the dominant color, optional secondary, variance, and recommended mode.
 */
export async function detectBackground(
  imageBlob: Blob
): Promise<BgDetectionResult> {
  const { url, path } = await stageImage(imageBlob);

  const res = await fetch('/api/background-removal/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, path }),
    credentials: 'include',
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
  const { url, path } = await stageImage(imageBlob);

  const payload: Record<string, unknown> = {
    url,
    path,
    mode: options.mode,
  };
  if (options.model) payload.model = options.model;
  if (options.targetColor)
    payload.target_color = rgbToString(options.targetColor);
  if (typeof options.tolerance === 'number')
    payload.tolerance = String(options.tolerance);
  if (options.seedPoints && options.seedPoints.length > 0) {
    payload.seed_points = JSON.stringify(options.seedPoints);
  }
  // Multi-color palettes (Phase 1.14): JSON arrays of [r, g, b].
  if (options.removeColors && options.removeColors.length > 0) {
    payload.target_colors_json = JSON.stringify(options.removeColors);
  }
  if (options.keepColors && options.keepColors.length > 0) {
    payload.keep_colors_json = JSON.stringify(options.keepColors);
  }

  // The Python rembg-service loads its ML model lazily on the first request to
  // a cold container (~3-6s), which can surface as a 502/503/504 before the
  // model is warm. Retry server-side (5xx) failures once after a short delay so
  // the user doesn't see a spurious "didn't remove" on the very first open.
  const doFetch = () =>
    fetch('/api/background-removal/in-house', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

  let res = await doFetch();
  if (!res.ok && res.status >= 500) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    res = await doFetch();
  }

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
  model: BgRemovalModel = 'bria-rmbg'
): Promise<RemoveResult> {
  return removeBackground(imageBlob, {
    mode: model === 'white-fill' ? 'color-fill' : 'ml+color',
    model: model === 'white-fill' ? undefined : model,
    targetColor: model === 'white-fill' ? [255, 255, 255] : undefined,
    tolerance: model === 'white-fill' ? 30 : undefined,
  });
}

export async function embedImage(imageBlob: Blob): Promise<SamSession> {
  const { url, path } = await stageImage(imageBlob);

  const res = await fetch('/api/background-removal/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, path }),
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Embedding failed (${res.status})`);
  }

  const data = await res.json();
  return {
    embeddingId: data.embedding_id ?? data.embeddingId,
    width: data.width,
    height: data.height,
  };
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
