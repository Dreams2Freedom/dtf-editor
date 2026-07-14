import { type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Shared request-image resolver for the in-house background-removal routes.
 *
 * The browser used to POST the full image as multipart directly to these
 * serverless routes, which capped them at Vercel's ~4.5MB request-body limit
 * (large designs 413'd before the handler ran). Now the browser stages the
 * full-resolution image in Supabase Storage and sends only a tiny JSON body
 * `{ url, path, ...fields }`; we fetch the bytes server-side (no inbound size
 * limit) and forward them to the rembg microservice. The legacy multipart path
 * is kept as a fallback so nothing breaks.
 */

const PASSTHROUGH_FIELDS = [
  'model',
  'mode',
  'target_color',
  'target_colors_json',
  'keep_colors_json',
  'tolerance',
  'seed_points',
  'post_process_white',
  'white_threshold',
] as const;

export interface ResolvedImage {
  ok: true;
  blob: Blob;
  fields: Record<string, string>;
  /** Temp storage object to delete after the upstream call (null for legacy multipart). */
  cleanupPath: string | null;
}

export interface ResolveError {
  ok: false;
  error: string;
  status: number;
}

export async function resolveRemovalImage(
  request: NextRequest,
  userId: string
): Promise<ResolvedImage | ResolveError> {
  const contentType = request.headers.get('content-type') || '';

  // Preferred path: staged-in-storage URL (bypasses the request-body limit).
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    const url: unknown = body?.url;
    if (!url || typeof url !== 'string') {
      return { ok: false, error: 'Missing image url', status: 400 };
    }

    const imgRes = await fetch(url).catch(() => null);
    if (!imgRes || !imgRes.ok) {
      return { ok: false, error: 'Could not fetch staged image', status: 502 };
    }
    const blob = await imgRes.blob();

    const fields: Record<string, string> = {};
    for (const key of PASSTHROUGH_FIELDS) {
      const v = body?.[key];
      if (typeof v === 'string') fields[key] = v;
    }

    // Only allow deleting objects under the caller's own folder.
    const path: unknown = body?.path;
    const cleanupPath =
      typeof path === 'string' && path.startsWith(`${userId}/`) ? path : null;

    return { ok: true, blob, fields, cleanupPath };
  }

  // Legacy fallback: direct multipart upload.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { ok: false, error: 'Failed to parse request', status: 400 };
  }

  const image = formData.get('image');
  if (!image || !(image instanceof Blob)) {
    return { ok: false, error: 'No image provided', status: 400 };
  }

  const fields: Record<string, string> = {};
  for (const key of PASSTHROUGH_FIELDS) {
    const v = formData.get(key);
    if (typeof v === 'string') fields[key] = v;
  }

  return { ok: true, blob: image, fields, cleanupPath: null };
}

/** Best-effort deletion of the staged temp object (scoped to the caller's folder). */
export async function cleanupStagedImage(
  cleanupPath: string | null
): Promise<void> {
  if (!cleanupPath) return;
  try {
    const serviceClient = createServiceRoleClient();
    await serviceClient.storage.from('images').remove([cleanupPath]);
  } catch (err) {
    console.error('[BG Removal] temp cleanup failed (non-fatal):', err);
  }
}
