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

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, is_admin')
    .eq('id', user.id)
    .single();

  const isPaid =
    profile?.is_admin === true ||
    (profile?.subscription_status &&
      profile.subscription_status !== 'free' &&
      profile.subscription_status !== 'cancelled');

  if (!isPaid) {
    return NextResponse.json(
      { error: 'Upgrade required', code: 'UPGRADE_REQUIRED' },
      { status: 403 }
    );
  }

  if (!env.REMBG_SERVICE_URL) {
    return NextResponse.json(
      { error: 'In-house background removal is not configured' },
      { status: 503 }
    );
  }

  const resolved = await resolveRemovalImage(request, user.id);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
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
    return NextResponse.json(
      { error: 'Background removal failed' },
      { status: 502 }
    );
  }

  const resultBuffer = await serviceRes.arrayBuffer();
  return new NextResponse(resultBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

export const POST = withRateLimit(handler, 'processing');
