import { createHmac } from 'crypto';
import { env } from '@/config/env';

/**
 * SEC-009: HMAC cookie signing to prevent forgery of impersonation and admin session cookies.
 * Uses SUPABASE_SERVICE_ROLE_KEY as the signing secret (always available server-side).
 */

function getSigningKey(): string {
  // Use a dedicated secret or fall back to service role key
  return process.env.COOKIE_SIGNING_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
}

export function signCookieValue(payload: string): string {
  const hmac = createHmac('sha256', getSigningKey());
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyCookieValue(signedValue: string): string | null {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const hmac = createHmac('sha256', getSigningKey());
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64url');

  // Constant-time comparison
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(signature, expectedSignature)
  ) {
    return null;
  }

  return payload;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
