#!/usr/bin/env node
/**
 * Test Encryption Format
 * Tests if our encryption produces output that passes Supabase validation
 */

const crypto = require('crypto');

// Use the actual encryption key from Vercel
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '6052ce223890b7991ab6d99fe8763ec56cfccdbfde47efd2be4a54e0b606f424';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

console.log('\n🔐 Testing Encryption Format...\n');
console.log('Encryption Key:', ENCRYPTION_KEY);
console.log('Key Length:', ENCRYPTION_KEY.length, 'characters (should be 64)');
console.log('Key Bytes:', ENCRYPTION_KEY.length / 2, 'bytes (should be 32)\n');

function encryptSensitiveData(text) {
  if (!text) return null;

  if (!ENCRYPTION_KEY) {
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
    console.error('❌ Encryption error:', error);
    return null;
  }
}

function isValidEncryptedFormat(encrypted_text) {
  if (encrypted_text === null) {
    return true; // NULL is valid (no data)
  }

  // Check minimum length (IV:16 + AuthTag:16 + MinData:16 = 48 bytes = 64 chars base64)
  if (encrypted_text.length < 64) {
    return false;
  }

  // Check if it's valid base64
  try {
    Buffer.from(encrypted_text, 'base64');
    return true;
  } catch {
    return false;
  }
}

// Test with sample SSN
const testSSN = '123-45-6789';
console.log('Test Input (SSN):', testSSN);

const encrypted = encryptSensitiveData(testSSN);
console.log('\n📤 Encryption Result:');
console.log('  Encrypted:', encrypted);
console.log('  Length:', encrypted ? encrypted.length : 0, 'characters');
console.log('  Is null:', encrypted === null);

if (encrypted) {
  const decoded = Buffer.from(encrypted, 'base64');
  console.log('  Decoded bytes:', decoded.length);
  console.log('  IV (16 bytes):', decoded.slice(0, 16).toString('hex'));
  console.log('  AuthTag (16 bytes):', decoded.slice(16, 32).toString('hex'));
  console.log('  Encrypted data:', decoded.slice(32).toString('hex'));
}

console.log('\n✅ Validation Test:');
const isValid = isValidEncryptedFormat(encrypted);
console.log('  Passes Supabase validation:', isValid ? '✅ YES' : '❌ NO');

if (!isValid) {
  console.log('\n❌ VALIDATION FAILED:');
  if (!encrypted) {
    console.log('  - Encryption returned null');
  } else if (encrypted.length < 64) {
    console.log('  - Encrypted string too short:', encrypted.length, '< 64 characters');
  } else {
    console.log('  - Invalid base64 format');
  }
} else {
  console.log('\n✅ SUCCESS: Encryption format is valid!');
}

console.log('\n');
