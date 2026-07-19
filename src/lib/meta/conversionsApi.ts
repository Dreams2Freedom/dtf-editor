import crypto from 'crypto';
import { env } from '@/config/env';

/**
 * Meta (Facebook) Conversions API — server-side event forwarding.
 *
 * Sends the same conversion events the browser Pixel fires, but from our
 * server, so tracking survives ad-blockers / ITP / cookie loss. Events are
 * deduplicated against the Pixel by Meta using a shared `event_id` + event
 * name (see the client helper in ./trackClient.ts).
 *
 * Security: the access token is a SERVER-ONLY secret read from
 * META_CAPI_ACCESS_TOKEN. It is never sent to the client. PII (email, phone,
 * name) is SHA-256 hashed before it leaves our server, per Meta's requirements;
 * IP address and user agent are sent raw (Meta hashes those itself).
 *
 * Every call is best-effort and never throws — a tracking failure must never
 * break a signup, checkout, or page load.
 */

/** Standard Meta event names we send. */
export type MetaEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'CompleteRegistration'
  | 'StartTrial'
  | 'Purchase'
  | 'Contact'
  | 'Lead';

export interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Do NOT hash — Meta hashes IP/UA itself. */
  clientIp?: string | null;
  /** Do NOT hash. */
  clientUserAgent?: string | null;
  /** _fbp browser cookie (Meta pixel), sent raw. */
  fbp?: string | null;
  /** _fbc browser cookie (click id), sent raw. */
  fbc?: string | null;
  /** A stable user id (e.g. Supabase user id) — hashed. */
  externalId?: string | null;
}

export interface MetaEventInput {
  eventName: MetaEventName;
  /** Shared with the Pixel event for deduplication. */
  eventId?: string;
  /** Unix seconds. Defaults to now. Must be within 7 days. */
  eventTime?: number;
  eventSourceUrl?: string;
  /** 'website' for browser-originated, 'system_generated' for server jobs. */
  actionSource?: 'website' | 'system_generated' | 'app' | 'other';
  userData?: MetaUserData;
  customData?: Record<string, unknown>;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashEmail(e: string): string {
  return sha256(e.trim().toLowerCase());
}
function hashPhone(p: string): string {
  // Digits only (keep country code); strip spaces, dashes, parens, +.
  return sha256(p.replace(/[^0-9]/g, ''));
}
function hashName(n: string): string {
  return sha256(n.trim().toLowerCase());
}

function buildUserData(u: MetaUserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (u.email) out.em = [hashEmail(u.email)];
  if (u.phone) out.ph = [hashPhone(u.phone)];
  if (u.firstName) out.fn = [hashName(u.firstName)];
  if (u.lastName) out.ln = [hashName(u.lastName)];
  if (u.externalId) out.external_id = [sha256(String(u.externalId))];
  if (u.clientIp) out.client_ip_address = u.clientIp;
  if (u.clientUserAgent) out.client_user_agent = u.clientUserAgent;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

/** True when the Conversions API is configured (pixel id + access token). */
export function isMetaCapiConfigured(): boolean {
  return !!env.META_PIXEL_ID && !!env.META_CAPI_ACCESS_TOKEN;
}

/**
 * Forward a single event to the Conversions API. Best-effort: returns a result
 * object and never throws.
 */
export async function sendMetaEvent(
  input: MetaEventInput
): Promise<{ success: boolean; error?: string }> {
  if (!isMetaCapiConfigured()) {
    return { success: false, error: 'Meta CAPI not configured' };
  }

  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: eventTime,
    action_source: input.actionSource ?? 'website',
    user_data: buildUserData(input.userData ?? {}),
  };
  if (input.eventId) event.event_id = input.eventId;
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (input.customData) event.custom_data = input.customData;

  const payload: Record<string, unknown> = { data: [event] };
  if (env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = env.META_CAPI_TEST_EVENT_CODE;
  }

  const url =
    `https://graph.facebook.com/${env.META_GRAPH_VERSION}/` +
    `${env.META_PIXEL_ID}/events?access_token=` +
    encodeURIComponent(env.META_CAPI_ACCESS_TOKEN);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(
        `[Meta CAPI] ${input.eventName} failed: ${res.status} ${body}`
      );
      return { success: false, error: `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (e) {
    console.error(`[Meta CAPI] ${input.eventName} network error:`, e);
    return { success: false, error: e instanceof Error ? e.message : 'error' };
  }
}

/**
 * Extract the client IP, user agent, and Meta cookies (_fbp/_fbc) from an
 * incoming request — improves match quality for events forwarded from an API
 * route on the user's behalf.
 */
export function metaUserDataFromRequest(request: Request): MetaUserData {
  const clientUserAgent = request.headers.get('user-agent') ?? undefined;
  const xff = request.headers.get('x-forwarded-for') ?? '';
  const clientIp =
    xff.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    undefined;

  // Parse _fbp / _fbc from the Cookie header (no dependency on a cookie lib).
  let fbp: string | undefined;
  let fbc: string | undefined;
  const cookie = request.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === '_fbp') fbp = decodeURIComponent(v.join('='));
    else if (k === '_fbc') fbc = decodeURIComponent(v.join('='));
  }

  return { clientUserAgent, clientIp, fbp, fbc };
}
