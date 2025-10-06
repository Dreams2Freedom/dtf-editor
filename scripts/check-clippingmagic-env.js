require('dotenv').config({ path: '.env.local' });

console.log('Checking ClippingMagic environment variables...\n');

const apiKey = process.env.CLIPPINGMAGIC_API_KEY;
const apiSecret = process.env.CLIPPING_MAGIC_API_SECRET;

console.log(
  'CLIPPINGMAGIC_API_KEY:',
  apiKey ? `Found (${apiKey})` : 'NOT FOUND'
);
console.log(
  'CLIPPING_MAGIC_API_SECRET:',
  apiSecret ? `Found (length: ${apiSecret.length})` : 'NOT FOUND'
);

if (apiKey && apiSecret) {
  console.log('\n✅ Both ClippingMagic credentials are present');
  console.log('API ID:', apiKey);
  console.log('API Secret length:', apiSecret.length, 'characters');

  // Check if secret looks valid (should be a long string)
  if (apiSecret.length < 10) {
    console.log(
      '\n⚠️  Warning: API Secret seems too short. ClippingMagic secrets are typically longer.'
    );
  }
} else {
  console.log('\n❌ Missing ClippingMagic credentials');
  if (!apiKey) console.log('   - CLIPPINGMAGIC_API_KEY is missing');
  if (!apiSecret) console.log('   - CLIPPING_MAGIC_API_SECRET is missing');
}
