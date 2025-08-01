require('dotenv').config({ path: '.env.local' });

const apiId = process.env.CLIPPINGMAGIC_API_KEY;
const apiSecret = process.env.CLIPPING_MAGIC_API_SECRET;

console.log('Testing ClippingMagic authentication...\n');

if (!apiId || !apiSecret) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

// Create Basic Auth header
const authHeader = 'Basic ' + Buffer.from(apiId + ':' + apiSecret).toString('base64');

console.log('API ID:', apiId);
console.log('API Secret length:', apiSecret.length);
console.log('Auth header:', authHeader.substring(0, 20) + '...');

// Test authentication with account endpoint
async function testAuth() {
  try {
    const response = await fetch('https://clippingmagic.com/api/v1/account', {
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log('\nAPI Response:');
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentication successful!');
      console.log('Account data:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Authentication failed');
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAuth();