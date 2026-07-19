import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import {
  PATCH_NOTE_MARKER_PREFIX,
  APP_VERSION,
  PATCH_NOTES,
} from '@/config/patchNotes';

interface PatchNoteContent {
  date: string;
  items: string[];
}

/** Parse the content JSON stored in a marker row's `message`, tolerantly. */
function parseContent(message: string | null | undefined): PatchNoteContent | null {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message);
    if (parsed && Array.isArray(parsed.items)) {
      return {
        date: typeof parsed.date === 'string' ? parsed.date : '',
        items: parsed.items.filter((s: unknown) => typeof s === 'string'),
      };
    }
  } catch {
    /* legacy / non-JSON marker → no content */
  }
  return null;
}

/** The default (code-authored) content for the current build's version. */
function defaultContent(): PatchNoteContent {
  const cfg = PATCH_NOTES.find(n => n.version === APP_VERSION) ?? PATCH_NOTES[0];
  return { date: cfg?.date ?? '', items: cfg?.items ? [...cfg.items] : [] };
}

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

    // Latest marker row (published OR saved-draft), so the admin can edit an
    // unpublished draft too.
    const { data } = await service!
      .from('notifications')
      .select('title, message, is_active')
      .like('title', `${PATCH_NOTE_MARKER_PREFIX}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const storedVersion = data?.title?.startsWith(PATCH_NOTE_MARKER_PREFIX)
      ? data.title.slice(PATCH_NOTE_MARKER_PREFIX.length)
      : null;
    const stored = parseContent(data?.message);
    const published = !!data?.is_active;

    // Editing surface: use the stored draft/published content if we have it,
    // otherwise seed from the code-authored default so there's always a
    // starting point to tweak.
    const base = stored ?? defaultContent();

    return NextResponse.json({
      // Version is always the current build — the content is what's editable.
      version: APP_VERSION,
      date: base.date,
      items: base.items,
      published,
      // Which version (if any) is currently LIVE for users.
      publishedVersion: published ? storedVersion : null,
    });
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
    const { publish } = body as { publish?: boolean };
    const version = (body as { version?: string }).version || APP_VERSION;
    const date = typeof (body as { date?: string }).date === 'string'
      ? (body as { date: string }).date
      : '';
    const rawItems = (body as { items?: unknown }).items;
    const items = Array.isArray(rawItems)
      ? rawItems
          .filter((s): s is string => typeof s === 'string')
          .map(s => s.trim())
          .filter(Boolean)
      : [];

    if (typeof publish !== 'boolean') {
      return NextResponse.json(
        { error: 'publish (boolean) is required' },
        { status: 400 }
      );
    }
    if (publish && items.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one patch-note line before publishing.' },
        { status: 400 }
      );
    }

    // Keep exactly one patch-note marker. The content is stored as JSON in
    // `message`; is_active marks whether it's live for users (true) or just a
    // saved draft (false). The prefix has no LIKE-wildcard characters, so this
    // only ever matches our own markers.
    await service!
      .from('notifications')
      .delete()
      .like('title', `${PATCH_NOTE_MARKER_PREFIX}%`);

    const { error: insertError } = await service!
      .from('notifications')
      .insert({
        type: 'announcement',
        title: `${PATCH_NOTE_MARKER_PREFIX}${version}`,
        message: JSON.stringify({ date, items }),
        target_audience: 'all',
        priority: 'normal',
        is_active: publish,
      });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      version,
      date,
      items,
      published: publish,
      publishedVersion: publish ? version : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet, 'admin');
export const POST = withRateLimit(handlePost, 'admin');
