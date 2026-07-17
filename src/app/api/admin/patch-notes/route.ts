import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { PATCH_NOTE_MARKER_PREFIX } from '@/config/patchNotes';

/**
 * Admin approval gate for the "What's new" patch-notes pop-up.
 *
 * Patch notes are authored in code (src/config/patchNotes.ts) but must NOT
 * reach users automatically on deploy — an admin has to explicitly publish the
 * current version here first. The "published version" is persisted as a single
 * sentinel row in the existing `notifications` table (title =
 * `${PATCH_NOTE_MARKER_PREFIX}<version>`), so no schema migration is needed.
 * That row is hidden from the normal announcement flows (Hamilton + admin
 * Manage list).
 *
 *   GET  → { publishedVersion: string | null }   (which version is live)
 *   POST { version, publish } → publish/unpublish that version
 */

/** Verify the caller is an admin; return the service-role client. */
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }
  return { service };
}

async function handleGet(_request: NextRequest) {
  try {
    const { error, service } = await requireAdmin();
    if (error) return error;

    const { data } = await service!
      .from('notifications')
      .select('title')
      .eq('is_active', true)
      .like('title', `${PATCH_NOTE_MARKER_PREFIX}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const version = data?.title?.startsWith(PATCH_NOTE_MARKER_PREFIX)
      ? data.title.slice(PATCH_NOTE_MARKER_PREFIX.length)
      : null;

    return NextResponse.json({ publishedVersion: version });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handlePost(request: NextRequest) {
  try {
    const { error, service } = await requireAdmin();
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const { version, publish } = body as {
      version?: string;
      publish?: boolean;
    };

    if (typeof publish !== 'boolean') {
      return NextResponse.json(
        { error: 'publish (boolean) is required' },
        { status: 400 }
      );
    }
    if (publish && !version) {
      return NextResponse.json(
        { error: 'version is required to publish' },
        { status: 400 }
      );
    }

    // Keep exactly one patch-note marker: clear any existing, then (if
    // publishing) insert a fresh one for this version. The prefix has no
    // LIKE-wildcard characters, so this only ever matches our own markers.
    await service!
      .from('notifications')
      .delete()
      .like('title', `${PATCH_NOTE_MARKER_PREFIX}%`);

    if (publish) {
      const { error: insertError } = await service!
        .from('notifications')
        .insert({
          type: 'announcement',
          title: `${PATCH_NOTE_MARKER_PREFIX}${version}`,
          message: 'Internal patch-notes release marker.',
          target_audience: 'all',
          priority: 'normal',
          is_active: true,
        });
      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      publishedVersion: publish ? version : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet, 'admin');
export const POST = withRateLimit(handlePost, 'admin');
