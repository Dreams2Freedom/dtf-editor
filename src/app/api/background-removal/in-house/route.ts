import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import {
  resolveRemovalImage,
  cleanupStagedImage,
} from '@/lib/background-removal/resolveImage';
import { logInhouseToolEvent } from '@/lib/analytics/inhouseToolEvents';

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

  // Telemetry for the free in-house tool (see /admin/inhouse-tools). Never
  // blocks or fails the removal — logging is fire-and-forget.
  const startedAt = Date.now();
  const logEvent = (
    status: 'success' | 'error',
    errorMessage?: string
  ): void => {
    void logInhouseToolEvent({
      userId: user.id,
      tool: 'background-removal',
      operation: 'ml-color',
      status,
      processingTimeMs: Date.now() - startedAt,
      errorMessage,
    });
  };

  // Free beta tool: any authenticated user may use the in-house engine — it
  // deducts no credits and runs on our own SAM service. The auth check above is
  // the only gate (this route previously returned 403 UPGRADE_REQUIRED for free
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

  const serviceRes = await fetch(`${env.REMBG_SERVICE_URL}/remove`, {
    method: 'POST',
    headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
    body: upstream,
  });

  // Delete the staged temp object now that the service has the bytes.
  await cleanupStagedImage(resolved.cleanupPath);

  if (!serviceRes.ok) {
    const text = await serviceRes.text().catch(() => '');
    console.error('[BG Removal] Service error:', serviceRes.status, text);
    logEvent('error', `service ${serviceRes.status}`);
    return NextResponse.json(
      { error: 'Background removal failed' },
      { status: 502 }
    );
  }

  const resultBuffer = await serviceRes.arrayBuffer();
  logEvent('success');
  return new NextResponse(resultBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

export const POST = withRateLimit(handler, 'processing');
