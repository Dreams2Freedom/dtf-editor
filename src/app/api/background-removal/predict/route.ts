import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handler(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Failed to parse request' }, { status: 400 });
  }

  const embeddingId = formData.get('embedding_id') as string;
  const points = formData.get('points') as string;

  if (!embeddingId || !points) {
    return NextResponse.json(
      { error: 'embedding_id and points are required' },
      { status: 400 }
    );
  }

  const upstream = new FormData();
  upstream.append('embedding_id', embeddingId);
  upstream.append('points', points);

  const serviceRes = await fetch(`${env.REMBG_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
    body: upstream,
  });

  if (!serviceRes.ok) {
    const text = await serviceRes.text().catch(() => '');
    console.error('[SAM Predict] Service error:', serviceRes.status, text);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 502 });
  }

  const resultBuffer = await serviceRes.arrayBuffer();
  return new NextResponse(resultBuffer, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

export const POST = withRateLimit(handler, 'processing');
