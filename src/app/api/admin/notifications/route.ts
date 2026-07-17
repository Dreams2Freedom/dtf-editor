import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { PATCH_NOTE_MARKER_PREFIX } from '@/config/patchNotes';

/** Admin-only: verify the caller is an admin, return the service-role client. */
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }
  return { service };
}

// List recent announcements (for the admin Manage tab).
async function handleGet(_request: NextRequest) {
  try {
    const { error, service } = await requireAdmin();
    if (error) return error;

    const { data, error: dbError } = await service!
      .from('notifications')
      .select(
        'id, title, message, type, target_audience, priority, is_active, created_at, expires_at'
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (dbError) throw dbError;

    // Exclude the internal patch-note release marker (managed on the Patch
    // Notes tab, not a real announcement).
    const notifications = (data ?? []).filter(
      n => !(typeof n.title === 'string' && n.title.startsWith(PATCH_NOTE_MARKER_PREFIX))
    );

    return NextResponse.json({ notifications });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Delete an announcement (cascades to per-user rows via the FK).
async function handleDelete(request: NextRequest) {
  try {
    const { error, service } = await requireAdmin();
    if (error) return error;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error: dbError } = await service!
      .from('notifications')
      .delete()
      .eq('id', id);
    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet, 'admin');
export const DELETE = withRateLimit(handleDelete, 'admin');
