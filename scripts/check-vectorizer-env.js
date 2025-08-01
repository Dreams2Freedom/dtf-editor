#!/usr/bin/env node

// Script to check Vectorizer.ai environment configuration

console.log('\n🔍 Checking Vectorizer.ai Environment Configuration...\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Check API credentials
const apiId = process.env.VECTORIZER_API_KEY;
const apiSecret = process.env.VECTORIZER_API_SECRET;

console.log('VECTORIZER_API_KEY:', apiId ? `✅ Set (${apiId.substring(0, 8)}...)` : '❌ NOT SET');
console.log('VECTORIZER_API_SECRET:', apiSecret ? '✅ Set' : '❌ NOT SET');

if (!apiId || !apiSecret) {
  console.log('\n⚠️  Missing Vectorizer.ai credentials!');
  console.log('\nPlease add the following to your .env.local file:');
  console.log('VECTORIZER_API_KEY=your_api_id_here');
  console.log('VECTORIZER_API_SECRET=your_api_secret_here');
  console.log('\nYou can get these from: https://vectorizer.ai/api');
  process.exit(1);
}

console.log('\n✅ Vectorizer.ai environment variables are configured!');

// Test API connection
console.log('\n🧪 Testing API connection...');

const testApiConnection = async () => {
  try {
    const authHeader = 'Basic ' + Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
    
    const response = await fetch('https://vectorizer.ai/api/v1/account', {
      headers: {
        'Authorization': authHeader
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful!');
      console.log('Account info:', data);
    } else {
      console.log('❌ API connection failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

testApiConnection();