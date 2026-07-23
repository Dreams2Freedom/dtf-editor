import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  sendMetaEvent,
  metaUserDataFromRequest,
  isMetaCapiConfigured,
  type MetaEventName,
  type MetaUserData,
} from '@/lib/meta/conversionsApi';

/**
 * Client → server bridge for the Meta Conversions API. The browser fires a
 * Pixel event with an `eventID`, then POSTs the same event here so we can
 * forward it server-side with the SAME id (Meta deduplicates the pair). The
 * server enriches it with the client IP / user agent / _fbp / _fbc and the
 * signed-in user's email, none of which the client should hash or send itself.
 */

const ALLOWED_EVENTS: ReadonlySet<string> = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'CompleteRegistration',
  'StartTrial',
  'Purchase',
  'Contact',
  'Lead',
]);

async function handlePost(request: NextRequest) {
  try {
    if (!isMetaCapiConfigured()) {
      // Not an error for the caller — CAPI simply isn't set up yet.
      return NextResponse.json({ success: false, skipped: true });
    }

    const body = await request.json().catch(() => ({}));
    const {
      eventName,
      eventId,
      eventSourceUrl,
      customData,
      userData: clientUserData,
    } = body as {
      eventName?: string;
      eventId?: string;
      eventSourceUrl?: string;
      customData?: Record<string, unknown>;
      userData?: Partial<MetaUserData>;
    };

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json(
        { success: false, error: 'Unknown event name' },
        { status: 400 }
      );
    }

    // Server-derived identifiers (IP / UA / Meta cookies).
    const reqUserData = metaUserDataFromRequest(request);

    // Best-effort: attach the signed-in user's email + id for match quality.
    let authEmail: string | null = null;
    let authId: string | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authEmail = user?.email ?? null;
      authId = user?.id ?? null;
    } catch {
      /* not signed in — fine */
    }

    const result = await sendMetaEvent({
      eventName: eventName as MetaEventName,
      eventId,
      eventSourceUrl,
      actionSource: 'website',
      customData,
      userData: {
        ...reqUserData,
        email: clientUserData?.email ?? authEmail,
        firstName: clientUserData?.firstName ?? null,
        lastName: clientUserData?.lastName ?? null,
        phone: clientUserData?.phone ?? null,
        externalId: authId,
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const POST = withRateLimit(handlePost, 'api');
