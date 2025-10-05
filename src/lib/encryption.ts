import crypto from 'crypto';

// CRITICAL: This encryption key should be stored in environment variables
// and NEVER committed to source control in production
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Validate encryption key
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error('WARNING: ENCRYPTION_KEY not set in production!');
}

/**
 * Encrypts sensitive data like SSN/Tax IDs
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptSensitiveData(text: string): string | null {
  if (!text) return null;

  // In development, if no key is set, return a placeholder
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      // In development, just base64 encode with a marker
      return `DEV_UNENCRYPTED_${Buffer.from(text).toString('base64')}`;
    }
    throw new Error('Encryption key not configured');
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);

    // Return base64 encoded
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

/**
 * Decrypts sensitive data
 */
export function decryptSensitiveData(encryptedText: string): string | null {
  if (!encryptedText) return null;

  // Handle development placeholders
  if (encryptedText.startsWith('DEV_UNENCRYPTED_')) {
    if (process.env.NODE_ENV !== 'production') {
      const base64 = encryptedText.replace('DEV_UNENCRYPTED_', '');
      return Buffer.from(base64, 'base64').toString('utf8');
    }
    return null;
  }

  if (!ENCRYPTION_KEY) {
    console.error('[ENCRYPTION] No encryption key found! Checked:', {
      NEXT_PUBLIC_ENCRYPTION_KEY: !!process.env.NEXT_PUBLIC_ENCRYPTION_KEY,
      ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY
    });
    throw new Error('Encryption key not configured');
  }

  try {
    // Decode from base64
    const combined = Buffer.from(encryptedText, 'base64');
    console.log('[ENCRYPTION] Decrypting data - combined length:', combined.length);

    // Extract components
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const encrypted = combined.slice(32);

    console.log('[ENCRYPTION] Component lengths - IV:', iv.length, 'AuthTag:', authTag.length, 'Data:', encrypted.length);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Set the authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    console.log('[ENCRYPTION] Decryption successful - decrypted length:', decrypted.length);
    return decrypted;
  } catch (error: any) {
    console.error('[ENCRYPTION] Decryption error:', {
      message: error.message,
      code: error.code,
      encryptedTextLength: encryptedText.length,
      hasKey: !!ENCRYPTION_KEY,
      keyLength: ENCRYPTION_KEY?.length
    });
    return null;
  }
}

/**
 * Masks sensitive data for display (shows only last 4 digits)
 */
export function maskSensitiveData(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars) return text;

  const maskedLength = text.length - visibleChars;
  const masked = '*'.repeat(maskedLength);
  const visible = text.slice(-visibleChars);

  return `${masked}${visible}`;
}

/**
 * Validates SSN format (XXX-XX-XXXX or XXXXXXXXX)
 */
export function isValidSSN(ssn: string): boolean {
  const cleaned = ssn.replace(/\D/g, '');
  return cleaned.length === 9;
}

/**
 * Validates EIN format (XX-XXXXXXX or XXXXXXXXX)
 */
export function isValidEIN(ein: string): boolean {
  const cleaned = ein.replace(/\D/g, '');
  return cleaned.length === 9;
}

/**
 * Sanitizes tax ID input (removes special characters except hyphens)
 */
export function sanitizeTaxId(taxId: string): string {
  return taxId.replace(/[^\d-]/g, '');
}

/**
 * Generates a secure encryption key (for initial setup only)
 * This should be run once during setup and the key stored securely
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Security audit function to check for unencrypted sensitive data
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;

  // Check if it's our encrypted format (base64 with specific length patterns)
  try {
    const decoded = Buffer.from(text, 'base64');
    // Our encrypted format should have at least 48 bytes (16 IV + 16 auth tag + data)
    return decoded.length >= 48;
  } catch {
    return false;
  }
}

/**
 * Encrypts the entire tax form data object
 */
export function encryptTaxFormData(formData: any): string | null {
  if (!formData) return null;

  try {
    // Remove sensitive fields that will be stored separately
    const { tax_id, ...otherData } = formData;

    // Encrypt the JSON string
    return encryptSensitiveData(JSON.stringify(otherData));
  } catch (error) {
    console.error('Error encrypting form data:', error);
    return null;
  }
}

/**
 * Decrypts the tax form data object
 */
export function decryptTaxFormData(encryptedData: string): any | null {
  if (!encryptedData) return null;

  try {
    const decrypted = decryptSensitiveData(encryptedData);
    if (!decrypted) return null;

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting form data:', error);
    return null;
  }
}