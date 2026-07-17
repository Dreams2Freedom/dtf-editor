import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { PATCH_NOTE_MARKER_PREFIX } from '@/config/patchNotes';

/**
 * Public (logged-in) read of the currently-published patch-notes version.
 *
 * The "What's new" modal calls this and only shows itself when the published
 * version matches the version baked into the build — i.e. an admin has approved
 * this release from the admin panel. Until then the modal stays hidden even
 * though the notes exist in code. See /api/admin/patch-notes for the writer.
 */

async function handleGet(_request: NextRequest) {
  try {
    // Require an authenticated session so pre-release notes aren't exposed to
    // anonymous scrapers, but the value itself is the same for every user.
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ publishedVersion: null });
    }

    const service = createServiceRoleClient();
    const { data } = await service
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
  } catch {
    return NextResponse.json({ publishedVersion: null });
  }
}

export const GET = withRateLimit(handleGet, 'api');
