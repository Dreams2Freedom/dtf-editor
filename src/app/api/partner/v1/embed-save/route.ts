import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';

/**
 * Partner Tools API — mint a signed upload URL for a refined-brush result.
 *
 * POST /api/partner/v1/embed-save
 *   Auth:  X-Embed-Token (or partner API key + { shop })
 *   Body:  {}   (path is server-chosen, scoped to the partner + shop)
 *   Returns: { path, token, publicUrl }
 *
 * The embed's brush exports a full-resolution PNG that can exceed Vercel's
 * ~4.5MB serverless body limit, so instead of POSTing the bytes through this
 * function we hand the browser a one-shot signed upload URL. The client uploads
 * straight to Supabase Storage via `uploadToSignedUrl(path, token, blob)`, then
 * uses `publicUrl` (the eventual public URL for `path`) as the Done resultUrl.
 * Plumbing for the free brush — records no usage/charge.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop } = gate;

  const safeShop = shop.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `partners/${partnerId}/${safeShop}/${Date.now()}-refined.png`;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from('images')
    .createSignedUploadUrl(path);
  if (error || !data?.token) {
    console.error('[Partner API] embed-save signed URL failed:', error);
    return json({ error: 'Could not prepare upload' }, 500);
  }

  const { data: pub } = supabase.storage.from('images').getPublicUrl(path);

  return json({
    path,
    token: data.token,
    publicUrl: pub?.publicUrl || '',
  });
}
