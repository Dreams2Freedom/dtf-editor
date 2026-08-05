import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';

/**
 * Partner Tools API — re-host an image into our storage (helper, not a tool).
 *
 * POST /api/partner/v1/rehost
 *   Auth:  X-Embed-Token (or partner API key + { shop })
 *   Body:  { imageUrl: "https://..." }
 *   Returns: { url }   (public URL on OUR Supabase Storage)
 *
 * Why: the embed's in-browser refine brush must read the ORIGINAL image pixels
 * onto a <canvas> (to restore wrongly-removed areas). The merchant's input is a
 * partner presigned URL that usually lacks CORS headers, which would taint the
 * canvas and block export. Re-hosting the bytes to our public bucket (which
 * serves permissive CORS) gives the browser a canvas-safe copy. This is plumbing
 * for the free brush — NOT a metered tool, so it records no usage/charge.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);

  const srcRes = await fetch(imageUrl).catch(() => null);
  if (!srcRes || !srcRes.ok) {
    return json({ error: 'Could not fetch imageUrl' }, 502);
  }
  const contentType = srcRes.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await srcRes.arrayBuffer());

  const ext = contentType.includes('jpeg')
    ? 'jpg'
    : contentType.includes('webp')
      ? 'webp'
      : 'png';
  const safeShop = shop.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `partners/${partnerId}/${safeShop}/${Date.now()}-orig.${ext}`;

  const supabase = createServiceRoleClient();
  const { error: upErr } = await supabase.storage
    .from('images')
    .upload(path, buffer, { contentType, upsert: true });
  if (upErr) {
    console.error('[Partner API] rehost upload failed:', upErr);
    return json({ error: 'Could not re-host image' }, 500);
  }

  const { data: pub } = supabase.storage.from('images').getPublicUrl(path);
  const url = pub?.publicUrl || '';
  if (!url) return json({ error: 'Could not resolve re-hosted URL' }, 500);

  return json({ url });
}
