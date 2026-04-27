import { NextResponse } from 'next/server';

import { env } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!env.REMBG_SERVICE_URL) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  const res = await fetch(`${env.REMBG_SERVICE_URL}/debug-sam`, {
    headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
  });
  const data = await res.json().catch(() => ({ error: 'Failed to parse response' }));
  return NextResponse.json(data, { status: res.status });
}
