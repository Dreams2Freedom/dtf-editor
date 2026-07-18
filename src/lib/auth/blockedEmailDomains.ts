/**
 * Blocked email domains — disposable / throwaway mail providers used to bypass
 * email verification and farm free credits. Signups on these domains are
 * rejected server-side.
 *
 * Keep entries lowercase and bare (no `@`). Subdomains are covered
 * automatically (e.g. `mx.besteya.com` matches `besteya.com`).
 */
export const BLOCKED_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'besteya.com',
]);

/** Extract the lowercase domain from an email address, or null if malformed. */
export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/**
 * True if the email's domain is blocked — either an exact match or a subdomain
 * of a blocked domain (so `foo@x.besteya.com` is blocked too).
 */
export function isBlockedEmailDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = emailDomain(email);
  if (!domain) return false;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
  for (const blocked of BLOCKED_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

/** Standard user-facing rejection message (kept vague — don't teach evasion). */
export const BLOCKED_EMAIL_MESSAGE =
  'This email provider is not supported. Please sign up with a permanent personal or work email address.';
