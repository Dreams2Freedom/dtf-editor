import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import {
  resolveRemovalImage,
  cleanupStagedImage,
} from '@/lib/background-removal/resolveImage';
import { logInhouseToolEvent } from '@/lib/analytics/inhouseToolEvents';

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

  // Telemetry for the free in-house SAM tool (see /admin/inhouse-tools).
  // Fire-and-forget; never blocks or fails the removal.
  const startedAt = Date.now();
  const logEvent = (
    status: 'success' | 'error',
    errorMessage?: string
  ): void => {
    void logInhouseToolEvent({
      userId: user.id,
      tool: 'background-removal',
      operation: 'sam-auto',
      status,
      processingTimeMs: Date.now() - startedAt,
      errorMessage,
    });
  };

  // Free beta tool: any authenticated user may use the in-house SAM engine — it
  // deducts no credits and runs on our own service. The auth check above is the
  // only gate (this route previously returned 403 UPGRADE_REQUIRED for free
  // users, which contradicted the "experimental free in-house tool" offer).

  if (!env.REMBG_SERVICE_URL) {
    return NextResponse.json(
      { error: 'In-house background removal is not configured' },
      { status: 503 }
    );
  }

  const resolved = await resolveRemovalImage(request, user.id);
  if (!resolved.ok) {
    logEvent('error', `input: ${resolved.error}`);
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
      logEvent('error', `service ${serviceRes.status}`);
      return NextResponse.json(
        { error: `Segmentation failed (${serviceRes.status})` },
        { status: 502 }
      );
    }

    const json = await serviceRes.json();
    logEvent('success', undefined);
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    await cleanupStagedImage(resolved.cleanupPath);
    console.error('[SAM Segment] Fetch error:', err);
    logEvent('error', 'service unreachable');
    return NextResponse.json(
      { error: 'Segmentation service unreachable' },
      { status: 502 }
    );
  }
}

export const POST = withRateLimit(handler, 'processing');
