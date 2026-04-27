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

  const image = formData.get('image');
  if (!image || !(image instanceof Blob)) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append('image', image, 'image.png');

  const serviceRes = await fetch(`${env.REMBG_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
    body: upstream,
  });

  if (!serviceRes.ok) {
    return NextResponse.json({ error: 'Embedding failed' }, { status: 502 });
  }

  const data = await serviceRes.json();
  return NextResponse.json(data);
}

export const POST = withRateLimit(handler, 'processing');
