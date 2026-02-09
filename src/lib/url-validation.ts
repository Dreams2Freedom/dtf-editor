/**
 * URL Validation Utilities
 *
 * Security functions to prevent SSRF and open redirect attacks
 */

/**
 * Validates an image URL to prevent SSRF attacks
 *
 * Only allows HTTPS URLs and blocks internal/private IP addresses
 * to prevent attackers from probing cloud infrastructure or internal services
 *
 * @param url - The URL to validate
 * @returns Object with validation result and optional error message
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS protocol (reject http, file, ftp, etc.)
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback addresses
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
      return { valid: false, error: 'Internal URLs are not allowed' };
    }

    // Block private IPv4 ranges
    const parts = hostname.split('.');
    if (parts.length === 4 && parts.every(p => !isNaN(Number(p)))) {
      const [a, b] = parts.map(Number);

      // 10.0.0.0/8
      if (a === 10) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }

      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }

      // 192.168.0.0/16
      if (a === 192 && b === 168) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }

      // 169.254.0.0/16 (link-local/metadata service)
      if (a === 169 && b === 254) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }
    }

    // Block private IPv6 ranges (basic check)
    if (hostname.includes(':')) {
      const lower = hostname.toLowerCase();
      // Block ::1 (already checked above)
      // Block fc00::/7 (unique local addresses)
      if (lower.startsWith('fc') || lower.startsWith('fd')) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }
      // Block fe80::/10 (link-local)
      if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates a redirect path to prevent open redirect attacks
 *
 * Only allows relative paths starting with / but not //
 * to prevent attackers from redirecting users to external phishing sites
 *
 * @param path - The redirect path to validate
 * @returns Object with validation result and sanitized path
 */
export function validateRedirectPath(path: string): { valid: boolean; sanitizedPath: string } {
  // Default to home page if no path provided
  if (!path || path.trim() === '') {
    return { valid: true, sanitizedPath: '/' };
  }

  const trimmed = path.trim();

  // Must start with / (relative path)
  if (!trimmed.startsWith('/')) {
    return { valid: false, sanitizedPath: '/' };
  }

  // Must NOT start with // (protocol-relative URL to external site)
  if (trimmed.startsWith('//')) {
    return { valid: false, sanitizedPath: '/' };
  }

  // Must NOT contain :// (absolute URL with protocol)
  if (trimmed.includes('://')) {
    return { valid: false, sanitizedPath: '/' };
  }

  return { valid: true, sanitizedPath: trimmed };
}
