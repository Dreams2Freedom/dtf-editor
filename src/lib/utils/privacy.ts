/**
 * Privacy utility functions for masking sensitive data
 */

/**
 * Masks an email address for privacy
 * Shows first half + last character, masks middle
 * Examples:
 *   john@example.com → joh*@example.com
 *   test@test.com → te*t@test.com
 *   verylongemail@gmail.com → veryl****l@gmail.com
 *   shannon@company.com → sha***n@company.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return 'u***r@example.com';

  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) return 'u***r@example.com';

  const len = localPart.length;

  // Show first half and last character, mask the middle
  if (len <= 2) {
    // Very short: show first char only
    return `${localPart[0]}*@${domain}`;
  } else if (len <= 4) {
    // Short: show first 2 and last 1, mask 1 char
    const firstPart = localPart.substring(0, 2);
    const lastChar = localPart[len - 1];
    return `${firstPart}*${lastChar}@${domain}`;
  } else if (len <= 6) {
    // Medium: show first 2-3 and last 1, mask middle
    const firstPart = localPart.substring(0, 3);
    const lastChar = localPart[len - 1];
    return `${firstPart}**${lastChar}@${domain}`;
  } else {
    // Long: show first half and last char, mask middle
    const showChars = Math.floor(len / 2);
    const firstPart = localPart.substring(0, showChars);
    const lastChar = localPart[len - 1];
    const maskLength = len - showChars - 1;
    const mask = '*'.repeat(Math.min(maskLength, 4));
    return `${firstPart}${mask}${lastChar}@${domain}`;
  }
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
    .map(part => (part.length > 0 ? part[0] + '***' : '***'))
    .join(' ');
}
