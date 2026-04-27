import type { BgRemovalModel, SamPoint, SamSession } from '@/types/backgroundRemoval';

export interface RemoveResult {
  blob: Blob;
  url: string;
}

/**
 * One-shot background removal via the in-house rembg microservice.
 * The server-side route handles auth-gating and proxying to the Python service.
 */
export async function removeBackground(
  imageBlob: Blob,
  model: BgRemovalModel = 'isnet-general-use'
): Promise<RemoveResult> {
  const form = new FormData();
  form.append('image', imageBlob, 'image.png');
  form.append('model', model);

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
 * Generate a SAM image embedding for interactive segmentation.
 * Call once per image; cache the returned session for /predict calls.
 */
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

/**
 * Run SAM mask prediction given a cached embedding and prompt points.
 * Returns a masked PNG blob (transparent = background).
 */
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
