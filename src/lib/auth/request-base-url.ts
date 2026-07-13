import { type NextRequest } from 'next/server';
import { env } from '@/config/env';

/**
 * Resolve the base URL to use for links we email to the user (e.g. the
 * email-verification link).
 *
 * We prefer the host the request actually arrived on, so verification links
 * work on Vercel preview deployments as well as production — otherwise a signup
 * on a preview would email a link pointing at production (which may not have the
 * route yet) and 404. We only trust the incoming host if it is our canonical
 * domain or a Vercel preview host (*.vercel.app); anything else could be a
 * spoofed Host header trying to inject a phishing link, so we fall back to the
 * fixed, trusted APP_URL.
 */
export function getTrustedBaseUrl(request: NextRequest): string {
  try {
    const appHost = new URL(env.APP_URL).hostname;
    const host =
      request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const url = new URL(`${proto}://${host}`);
      if (url.hostname === appHost || url.hostname.endsWith('.vercel.app')) {
        return url.origin;
      }
    }
  } catch {
    // Fall through to the trusted default.
  }
  return env.APP_URL;
}
