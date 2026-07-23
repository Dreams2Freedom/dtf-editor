import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';
import { PATCH_NOTE_MARKER_PREFIX, PATCH_NOTES } from '@/config/patchNotes';

interface PatchNoteContent {
  date: string;
  items: string[];
}

/** Parse the content JSON stored in a marker row's `message`, tolerantly. */
function parseContent(
  message: string | null | undefined
): PatchNoteContent | null {
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

/** A starting-point default (from code) the first time no note exists yet. */
function defaultContent(): PatchNoteContent {
  const cfg = PATCH_NOTES[0];
  return { date: cfg?.date ?? '', items: cfg?.items ? [...cfg.items] : [] };
}

/**
 * Patch-notes writer for the "What's new" pop-up.
 *
 * A patch note is authored entirely here (date + bullet lines) — it is NO LONGER
 * tied to the build's APP_VERSION, so the admin can create a brand-new note any
 * time without a code deploy. The current note is stored as a single sentinel
 * row in `notifications` (title = `${PATCH_NOTE_MARKER_PREFIX}<version>`, content
 * as JSON in `message`, is_active = published). Only ONE marker exists at a time,
 * so users are only ever shown the most recent note, once each.
 *
 *   GET  → { version, date, items, published, publishedVersion }
 *   POST { date, items, publish, asNew }
 *          asNew=true  → mints a NEW version id → every user sees it once
 *          asNew=false → keeps the current version → edit live without re-notifying
 */

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

/** Read the single current marker (published OR draft), newest wins. */
async function currentMarker(
  service: ReturnType<typeof createServiceRoleClient>
) {
  const { data } = await service
    .from('notifications')
    .select('title, message, is_active')
    .like('title', `${PATCH_NOTE_MARKER_PREFIX}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = data?.title?.startsWith(PATCH_NOTE_MARKER_PREFIX)
    ? data.title.slice(PATCH_NOTE_MARKER_PREFIX.length)
    : null;
  return {
    version,
    content: parseContent(data?.message),
    published: !!data?.is_active,
  };
}

async function handleGet(_request: NextRequest) {
  try {
    const { error, service } = await requireAdmin();
    if (error) return error;

    const { version, content, published } = await currentMarker(service!);
    const base = content ?? defaultContent();

    return NextResponse.json({
      version, // current note's id (null if none authored yet)
      date: base.date,
      items: base.items,
      published,
      publishedVersion: published ? version : null,
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
    const publish = (body as { publish?: boolean }).publish;
    const asNew = (body as { asNew?: boolean }).asNew === true;
    const date =
      typeof (body as { date?: string }).date === 'string'
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

    // Decide the version id. A NEW note (or the first one ever) mints a fresh id
    // so every user is shown it once; editing the live note keeps the same id so
    // users who already saw it aren't re-notified.
    const existing = await currentMarker(service!);
    const version =
      asNew || !existing.version ? `v-${Date.now()}` : existing.version;

    // Keep exactly one marker.
    await service!
      .from('notifications')
      .delete()
      .like('title', `${PATCH_NOTE_MARKER_PREFIX}%`);

    const { error: insertError } = await service!.from('notifications').insert({
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
