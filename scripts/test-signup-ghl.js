#!/usr/bin/env node

/**
 * Test if GoHighLevel integration is working in signup flow
 */

require('dotenv').config({ path: '.env.local' });

// Import the GoHighLevel service
const { goHighLevelService } = require('../src/services/goHighLevel');

async function testGoHighLevelIntegration() {
  console.log('Testing GoHighLevel Integration in Signup Flow\n');
  console.log('========================================\n');

  // Check if GoHighLevel is configured
  const apiKey = process.env.GOHIGHLEVEL_API_KEY;
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID;

  console.log('Configuration Check:');
  console.log(`API Key: ${apiKey ? 'Found' : 'Not found'}`);
  console.log(`Location ID: ${locationId ? 'Found' : 'Not found'}`);

  if (!apiKey || !locationId) {
    console.error('\nError: GoHighLevel not configured properly');
    return;
  }

  // Test creating a contact (simulating signup)
  console.log('\nSimulating signup contact creation...');

  const testContact = {
    firstName: 'Test',
    lastName: 'Signup',
    email: `test-signup-${Date.now()}@example.com`,
    phone: '',
    source: 'DTF Editor Signup',
    tags: ['dtf-tool-signup', 'website-lead', 'free-account'],
    customFields: {
      company: 'Test Company',
      signupDate: new Date().toISOString(),
      accountType: 'free',
      initialCredits: 2,
    },
  };

  try {
    const result = await goHighLevelService.createContact(testContact);

    if (result.success) {
      console.log('✅ Contact created successfully!');
      console.log('   Contact:', result.contact);
    } else {
      console.log('❌ Failed to create contact');
      console.log('   Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during contact creation:', error);
  }

  console.log('\n========================================\n');
  console.log(
    'If contact creation succeeded, the signup integration is working!'
  );
}

testGoHighLevelIntegration().catch(console.error);
