#!/usr/bin/env node
/**
 * Generate Encryption Key for Tax Form Data
 *
 * This script generates a secure 256-bit encryption key for encrypting
 * sensitive affiliate tax information (SSNs, EINs, etc.)
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *
 * The generated key should be set as ENCRYPTION_KEY in Vercel environment variables
 */

const crypto = require('crypto');

console.log('\n🔐 Generating 256-bit AES Encryption Key...\n');

// Generate a secure random 256-bit key (32 bytes)
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('✅ Encryption key generated successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('ENCRYPTION_KEY=' + encryptionKey);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Next Steps:');
console.log('1. Copy the ENCRYPTION_KEY value above');
console.log(
  '2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables'
);
console.log('3. Add a new environment variable:');
console.log('   - Name: ENCRYPTION_KEY');
console.log('   - Value: (paste the key above)');
console.log('   - Environment: Production, Preview, Development (all)');
console.log('4. Redeploy your application\n');

console.log('⚠️  SECURITY WARNING:');
console.log('- Store this key securely');
console.log('- Never commit this key to source control');
console.log('- If this key is lost, encrypted data cannot be decrypted');
console.log(
  '- Rotating this key will invalidate all existing encrypted data\n'
);
