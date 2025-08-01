#!/usr/bin/env node

require('dotenv').config();
const fetch = require('node-fetch');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_ID = process.argv[2];

if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

if (!TEST_USER_ID) {
  console.error('❌ Usage: node test-credit-reset-api.js <user-id>');
  console.error('Example: node test-credit-reset-api.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

async function testCreditReset() {
  console.log('🧪 Testing credit reset API...\n');
  
  try {
    // Test single user reset
    console.log(`📝 Testing credit reset for user: ${TEST_USER_ID}`);
    
    const response = await fetch(`${APP_URL}/api/credits/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SERVICE_KEY
      },
      body: JSON.stringify({ userId: TEST_USER_ID })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to reset credits: ${response.status}`);
      console.error(error);
      return;
    }

    const result = await response.json();
    console.log('✅ Credit reset response:', JSON.stringify(result, null, 2));

    // Test reset all (commented out for safety)
    // console.log('\n📝 Testing reset all credits...');
    // const resetAllResponse = await fetch(`${APP_URL}/api/credits/reset`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-api-key': SERVICE_KEY
    //   },
    //   body: JSON.stringify({ resetAll: true })
    // });
    
    // const resetAllResult = await resetAllResponse.json();
    // console.log('✅ Reset all response:', JSON.stringify(resetAllResult, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing credit reset:', error);
  }
}

testCreditReset();