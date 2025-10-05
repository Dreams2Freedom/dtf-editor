const crypto = require('crypto');

// IMPORTANT: Set this to your actual ENCRYPTION_KEY from Vercel
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '6052ce223890b7991ab6d99fe8763ec56cfccdbfde47efd2be4a54e0b606f424';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Test data from production database
const TEST_TAX_ID = "yPVPs/fZPFoN/xmvkNdHPCwHcVhS9GZ3uNzaEtIMmNkxLj8JzFk+D2T8";
const TEST_FORM_DATA = "SR7cqAx0mTSdjLH2wW8f1PKP+O9jQLMLtDsIgYctPd02md7h28Joaoh4SeyI9lDc9oxNroR8GHkbcaLFQR/CLLxRqPAnzOAWt4DtiKDpHL/IexQH8XQpp/X/OpYkzv3Aw/FMdQaTkKwOzkFFumIM/SoN17vY3Bxe/pfMIqZBeljEJXK8HjQKRRPkrQpSaknsRxmpmNjdDr8Isz/4ixffQBekjOmVthQdwWrmI5PRtWxdI2yYMpUDQHf+EH35PfrrIQfFSR8yxBhbjfqLj1TIzAb9N/yymSpyzdD3Vt48rLnDSFm/dSZMEslxbtwUAVE4AK4XyildB8GQN8BIBZ2/Cg/Ead+6MPrnfqlfazOjAeeJoGGuVtbI82+9Bolp4cm+Avwzkf4COKWsrr00iE1jm3DXUihQcON/DSTRLk0NtDPmZIbgyhLzfbzLJmZEIa+RTGFDpcAxMheVFLuiHlneaSk=";

function decryptSensitiveData(encryptedText) {
  if (!encryptedText) return null;

  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  console.log('\n=== Decryption Debug Info ===');
  console.log('Encrypted text length:', encryptedText.length);
  console.log('Encryption key length:', ENCRYPTION_KEY.length);
  console.log('Encryption key (first 10 chars):', ENCRYPTION_KEY.substring(0, 10) + '...');

  try {
    // Decode from base64
    const combined = Buffer.from(encryptedText, 'base64');
    console.log('Combined buffer length:', combined.length);

    // Extract components
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const encrypted = combined.slice(32);

    console.log('IV length:', iv.length);
    console.log('AuthTag length:', authTag.length);
    console.log('Encrypted data length:', encrypted.length);

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

    console.log('✅ Decryption successful!');
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    return null;
  }
}

function decryptTaxFormData(encryptedData) {
  if (!encryptedData) return null;

  try {
    const decrypted = decryptSensitiveData(encryptedData);
    if (!decrypted) return null;

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error parsing JSON after decryption:', error.message);
    return null;
  }
}

console.log('\n🔍 Testing Tax ID Decryption...');
console.log('================================');
const taxId = decryptSensitiveData(TEST_TAX_ID);
if (taxId) {
  console.log('Tax ID:', taxId);
} else {
  console.log('Failed to decrypt tax ID');
}

console.log('\n🔍 Testing Form Data Decryption...');
console.log('================================');
const formData = decryptTaxFormData(TEST_FORM_DATA);
if (formData) {
  console.log('Form Data:', JSON.stringify(formData, null, 2));
} else {
  console.log('Failed to decrypt form data');
}

console.log('\n✅ Test complete!');
