/**
 * Format phone number as user types
 * Handles US/Canada phone numbers (10 digits)
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Limit to 10 digits for US/Canada
  const limitedNumber = phoneNumber.slice(0, 10);
  
  // Format based on length
  if (limitedNumber.length === 0) {
    return '';
  } else if (limitedNumber.length <= 3) {
    return `(${limitedNumber}`;
  } else if (limitedNumber.length <= 6) {
    return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3)}`;
  } else {
    return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6)}`;
  }
}

/**
 * Clean phone number for storage (removes formatting)
 */
export function cleanPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(value: string): boolean {
  const cleaned = cleanPhoneNumber(value);
  // US/Canada phone numbers should be 10 digits
  return cleaned.length === 10;
}

/**
 * Format phone number for display (from database)
 */
export function displayPhoneNumber(value: string | null | undefined): string {
  if (!value) return '';
  
  // If it's already formatted, return as is
  if (value.includes('(') || value.includes('-')) {
    return value;
  }
  
  // Format unformatted number
  return formatPhoneNumber(value);
}