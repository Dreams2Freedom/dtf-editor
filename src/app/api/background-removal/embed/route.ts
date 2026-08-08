import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import {
  resolveRemovalImage,
  cleanupStagedImage,
} from '@/lib/background-removal/resolveImage';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function handler(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Free beta tool: any authenticated user may use the in-house engine — it
  // deducts no credits and runs on our own SAM service. The auth check above is
  // the only gate (this route previously returned 403 UPGRADE_REQUIRED for free
  // users, which contradicted the "experimental free in-house tool" offer).

  if (!env.REMBG_SERVICE_URL) {
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    );
  }

  const resolved = await resolveRemovalImage(request, user.id);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status }
    );
  }

  const upstream = new FormData();
  upstream.append('image', resolved.blob, 'image.png');

  let serviceRes: Response;
  try {
    serviceRes = await fetch(`${env.REMBG_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
      body: upstream,
    });
  } catch (err) {
    console.error('[bg-removal/embed] fetch failed:', err);
    await cleanupStagedImage(resolved.cleanupPath);
    return NextResponse.json({ error: 'Service unreachable' }, { status: 503 });
  }

  await cleanupStagedImage(resolved.cleanupPath);

  if (!serviceRes.ok) {
    let detail = 'Embedding failed';
    try {
      const body = await serviceRes.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      try {
        const text = await serviceRes.text();
        if (text) detail = text.slice(0, 500);
      } catch {}
    }
    console.error(
      '[bg-removal/embed] upstream error',
      serviceRes.status,
      detail
    );
    return NextResponse.json(
      { error: detail, upstreamStatus: serviceRes.status },
      { status: serviceRes.status === 503 ? 503 : 502 }
    );
  }

  const data = await serviceRes.json();
  return NextResponse.json(data);
}

export const POST = withRateLimit(handler, 'processing');
