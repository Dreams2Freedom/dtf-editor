#!/usr/bin/env node

/**
 * Decode and analyze the JWT token
 */

require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOHIGHLEVEL_API_KEY;

if (!apiKey) {
  console.error('No API key found');
  process.exit(1);
}

console.log('JWT Token Analysis\n');
console.log('Full token:', apiKey);
console.log('\n');

try {
  const parts = apiKey.split('.');

  if (parts.length !== 3) {
    console.error('Invalid JWT format - should have 3 parts separated by dots');
    process.exit(1);
  }

  // Decode header
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  console.log('Header:', JSON.stringify(header, null, 2));

  // Decode payload
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  console.log('\nPayload:', JSON.stringify(payload, null, 2));

  // Check timestamps
  if (payload.iat) {
    const issuedDate = new Date(payload.iat);
    console.log('\nIssued at (raw):', payload.iat);
    console.log('Issued at (converted):', issuedDate.toISOString());

    // Check if the timestamp is in milliseconds (typical) or seconds
    const currentTime = Date.now();
    if (payload.iat > currentTime) {
      console.log('WARNING: Token issued date is in the future!');

      // Maybe it's in milliseconds?
      const issuedDateMs = new Date(payload.iat / 1000);
      console.log('If divided by 1000:', issuedDateMs.toISOString());
    }
  }

  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000);
    console.log('\nExpires at:', expDate.toISOString());

    const now = Date.now() / 1000;
    if (payload.exp < now) {
      console.log('WARNING: Token is expired!');
    } else {
      console.log('Token is still valid');
    }
  } else {
    console.log('\nNo expiration date set (token does not expire)');
  }

  // Signature (we can't verify it without the secret)
  console.log('\nSignature:', parts[2]);
  console.log('(Cannot verify signature without the server secret)');
} catch (error) {
  console.error('Error decoding token:', error.message);
}
