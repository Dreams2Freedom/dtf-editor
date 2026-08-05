import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/config/env';

/**
 * Short-lived, signed embed-session tokens for the Partner Tools API.
 *
 * The gangsheet app's BACKEND (which holds the secret partner API key) mints one
 * of these per per-image editing session. The token is handed to the BROWSER
 * embed, which uses it to authorize tool calls — so the secret API key is never
 * exposed client-side. Stateless (HMAC-signed), so no DB lookup.
 */

const EXPLICIT_SECRET = process.env.PARTNER_EMBED_SECRET || '';
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';

// A strong signing secret requires either an explicit PARTNER_EMBED_SECRET or,
// failing that, a real service-role key to derive from. If NEITHER is present
// the derived secret collapses to HMAC(..., 'dev-secret') — a hardcoded,
// source-visible value that would make embed tokens trivially forgeable for any
// shop. We therefore refuse to sign or verify tokens in that state (in
// production) rather than run the Partner Tools API with a guessable key. In
// production the service-role key is always set, so this is a fail-safe guard,
// not a functional constraint.
const HAS_STRONG_SECRET = Boolean(EXPLICIT_SECRET || SERVICE_KEY);
const IS_PROD = process.env.NODE_ENV === 'production';

const SECRET =
  EXPLICIT_SECRET ||
  createHmac('sha256', 'dtf-partner-embed-v1')
    .update(SERVICE_KEY || 'dev-secret')
    .digest('hex');

function assertStrongSecret(): void {
  if (IS_PROD && !HAS_STRONG_SECRET) {
    throw new Error(
      'Embed token secret is not configured: set PARTNER_EMBED_SECRET ' +
        '(or SUPABASE_SERVICE_ROLE_KEY). Refusing to mint tokens with a ' +
        'guessable fallback secret.'
    );
  }
}

export interface EmbedClaims {
  partnerId: string;
  shop: string;
  imageUrl: string;
  exp: number; // unix seconds
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function signEmbedToken(
  claims: Omit<EmbedClaims, 'exp'>,
  ttlSeconds = 1800
): { token: string; exp: number } {
  assertStrongSecret();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: EmbedClaims = { ...claims, exp };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac('sha256', SECRET).update(body).digest());
  return { token: `${body}.${sig}`, exp };
}

export function verifyEmbedToken(token: string): EmbedClaims | null {
  // Fail closed: if the secret would be the guessable fallback in production,
  // reject every token rather than accept a possibly-forged one.
  if (IS_PROD && !HAS_STRONG_SECRET) return null;
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = b64url(createHmac('sha256', SECRET).update(body).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const claims = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as EmbedClaims;
    if (
      !claims.partnerId ||
      !claims.shop ||
      !claims.exp ||
      claims.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
