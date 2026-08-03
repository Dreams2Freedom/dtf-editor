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

const SECRET =
  process.env.PARTNER_EMBED_SECRET ||
  createHmac('sha256', 'dtf-partner-embed-v1')
    .update(env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret')
    .digest('hex');

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
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: EmbedClaims = { ...claims, exp };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac('sha256', SECRET).update(body).digest());
  return { token: `${body}.${sig}`, exp };
}

export function verifyEmbedToken(token: string): EmbedClaims | null {
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
