/**
 * SEC-009: HMAC cookie signing to prevent forgery of impersonation and admin session cookies.
 * Uses Web Crypto API for Edge Runtime compatibility (middleware runs in Edge).
 * Uses SUPABASE_SERVICE_ROLE_KEY as the signing secret (always available server-side).
 */

function getSigningKey(): string {
  // Use a dedicated secret or fall back to service role key
  return process.env.COOKIE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

const encoder = new TextEncoder();

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSigningKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  // Convert to base64url
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signCookieValue(payload: string): Promise<string> {
  const signature = await hmacSign(payload);
  return `${payload}.${signature}`;
}

export async function verifyCookieValue(signedValue: string): Promise<string | null> {
  const lastDot = signedValue.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = signedValue.slice(0, lastDot);
  const signature = signedValue.slice(lastDot + 1);

  const expectedSignature = await hmacSign(payload);

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
