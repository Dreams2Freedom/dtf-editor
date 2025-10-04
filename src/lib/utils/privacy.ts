/**
 * Privacy utility functions for masking sensitive data
 */

/**
 * Masks an email address for privacy
 * Examples:
 *   john@example.com → j***@example.com
 *   verylongemail@gmail.com → ver***@gmail.com
 *   a@test.com → a***@test.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '***@***.***';

  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) return '***@***.***';

  // Show first 1-3 characters depending on length
  let visibleChars = 1;
  if (localPart.length > 6) visibleChars = 3;
  else if (localPart.length > 3) visibleChars = 2;

  const maskedLocal = localPart.substring(0, visibleChars) + '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Masks a name for privacy
 * Examples:
 *   John Doe → J*** D***
 *   Alice → A***
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '***';

  const parts = name.trim().split(/\s+/);

  return parts
    .map(part => part.length > 0 ? part[0] + '***' : '***')
    .join(' ');
}
