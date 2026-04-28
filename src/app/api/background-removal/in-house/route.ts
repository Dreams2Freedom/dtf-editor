import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse request' },
      { status: 400 }
    );
  }

  const image = formData.get('image');
  if (!image || !(image instanceof Blob)) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append('image', image, 'image.png');

  // Forward every supported field if present
  const passthrough = [
    'model',
    'mode',
    'target_color',
    'target_colors_json',
    'keep_colors_json',
    'tolerance',
    'seed_points',
    'post_process_white',
    'white_threshold',
  ];
  for (const key of passthrough) {
    const v = formData.get(key);
    if (v !== null && typeof v === 'string') {
      upstream.append(key, v);
    }
  }

  const serviceRes = await fetch(`${env.REMBG_SERVICE_URL}/remove`, {
    method: 'POST',
    headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
    body: upstream,
  });

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
