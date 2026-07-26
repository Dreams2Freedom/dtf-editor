import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import {
  resolveRemovalImage,
  cleanupStagedImage,
} from '@/lib/background-removal/resolveImage';

/**
 * SAM automatic "find everything" segmentation (admin eval only).
 *
 * Mirrors the in-house background-removal proxy: the browser stages the image
 * in storage and sends { url, path, points_per_side }; we fetch the bytes and
 * forward them to the rembg microservice's /segment-everything endpoint, which
 * returns JSON { overlay_png, cutout_png, num_pieces, elapsed_ms }.
 *
 * This is gated to admins — it exists to evaluate SAM-as-identifier before any
 * of it is wired into the customer-facing tool.
 */

export const runtime = 'nodejs';
export const maxDuration = 120; // SAM grid sweep on CPU can be slow; allow room.

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profile?.is_admin !== true) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  if (!env.REMBG_SERVICE_URL) {
    return NextResponse.json(
      { error: 'In-house background removal is not configured' },
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
  for (const [key, value] of Object.entries(resolved.fields)) {
    upstream.append(key, value);
  }

  try {
    const serviceRes = await fetch(
      `${env.REMBG_SERVICE_URL}/segment-everything`,
      {
        method: 'POST',
        headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
        body: upstream,
      }
    );

    await cleanupStagedImage(resolved.cleanupPath);

    if (!serviceRes.ok) {
      const text = await serviceRes.text().catch(() => '');
      console.error('[SAM Segment] Service error:', serviceRes.status, text);
      return NextResponse.json(
        { error: `Segmentation failed (${serviceRes.status})` },
        { status: 502 }
      );
    }

    const json = await serviceRes.json();
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    await cleanupStagedImage(resolved.cleanupPath);
    console.error('[SAM Segment] Fetch error:', err);
    return NextResponse.json(
      { error: 'Segmentation service unreachable' },
      { status: 502 }
    );
  }
}

export const POST = withRateLimit(handler, 'processing');
