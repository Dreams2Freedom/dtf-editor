/**
 * Client-side Meta tracking helper. Fires the browser Pixel AND mirrors the
 * same event to our Conversions API endpoint with a SHARED event id, so Meta
 * deduplicates the pair (counts it once) while still capturing the conversion
 * even when the Pixel is blocked.
 *
 * Usage (from any client component):
 *   import { metaTrack } from '@/lib/meta/trackClient';
 *   metaTrack('InitiateCheckout', { customData: { value: 9.99, currency: 'USD' } });
 */

type Fbq = (...args: unknown[]) => void;

interface MetaTrackOptions {
  customData?: Record<string, unknown>;
  /** Optional plaintext PII the server will hash (e.g. on a signup form). */
  userData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

function newEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function metaTrack(
  eventName: string,
  options: MetaTrackOptions = {}
): void {
  if (typeof window === 'undefined') return;
  const eventId = newEventId();

  // 1) Browser Pixel — tagged with eventID for dedup against the server event.
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === 'function') {
    fbq('track', eventName, options.customData ?? {}, { eventID: eventId });
  }

  // 2) Server Conversions API — same eventId → Meta deduplicates the pair.
  try {
    fetch('/api/meta/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        customData: options.customData,
        userData: options.userData,
      }),
    }).catch(() => {
      /* best-effort — never block the UI */
    });
  } catch {
    /* ignore */
  }
}
