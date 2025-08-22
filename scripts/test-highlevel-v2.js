#!/usr/bin/env node

/**
 * Test script for GoHighLevel API v2
 * Tests the new v2 endpoints and authentication
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env' });

const fetch = require('node-fetch');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function testHighLevelV2() {
  console.log(`${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}   GoHighLevel API v2 Test${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}\n`);

  // Get configuration
  const apiKey = process.env.GOHIGHLEVEL_API_KEY || process.env.GHL_API_KEY;
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID || process.env.GHL_LOCATION_ID;
  const baseUrl = process.env.NEXT_PUBLIC_GHL_API_URL || 'https://services.leadconnectorhq.com';

  console.log(`${colors.blue}Configuration:${colors.reset}`);
  console.log(`- API Key: ${apiKey ? `${colors.green}✓ Found (${apiKey.substring(0, 20)}...)${colors.reset}` : `${colors.red}✗ Not found${colors.reset}`}`);
  console.log(`- Location ID: ${locationId ? `${colors.green}✓ Found (${locationId})${colors.reset}` : `${colors.red}✗ Not found${colors.reset}`}`);
  console.log(`- Base URL: ${baseUrl}\n`);

  if (!apiKey || !locationId) {
    console.error(`${colors.red}Error: Missing required environment variables!${colors.reset}`);
    console.log(`${colors.yellow}Please ensure GOHIGHLEVEL_API_KEY and GOHIGHLEVEL_LOCATION_ID are set${colors.reset}`);
    process.exit(1);
  }

  // Decode JWT to understand token type
  console.log(`${colors.blue}Token Analysis:${colors.reset}`);
  try {
    const parts = apiKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log(`- Token Type: ${payload.company_id ? 'Company/Agency' : payload.location_id ? 'Location' : 'Unknown'}`);
      if (payload.company_id) console.log(`- Company ID: ${payload.company_id}`);
      if (payload.location_id) console.log(`- Token Location ID: ${payload.location_id}`);
      console.log(`- Subject: ${payload.sub}`);
      console.log(`- Issued: ${new Date(payload.iat).toISOString()}`);
      if (payload.exp) console.log(`- Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    }
  } catch (e) {
    console.log(`${colors.yellow}Could not decode token${colors.reset}`);
  }
  console.log();

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Location Details (v2 endpoint)
  console.log(`${colors.cyan}Test 1: Get Location Details (v2)${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/locations/${locationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓ Successfully connected to GoHighLevel v2!${colors.reset}`);
      console.log(`  Location Name: ${data.name || data.companyName || 'N/A'}`);
      console.log(`  Location ID: ${data.id || locationId}`);
      if (data.email) console.log(`  Email: ${data.email}`);
      testsPassed++;
    } else {
      const errorText = await response.text();
      console.error(`${colors.red}✗ Failed to fetch location details${colors.reset}`);
      console.error(`  Status: ${response.status} ${response.statusText}`);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) console.error(`  Error: ${errorData.message}`);
      } catch {
        console.error(`  Response: ${errorText.substring(0, 200)}`);
      }
      
      testsFailed++;
      
      if (response.status === 401) {
        console.log(`${colors.yellow}Hint: The API key may be invalid or expired${colors.reset}`);
      }
    }
  } catch (e) {
    console.error(`${colors.red}✗ Network error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Test 2: Contact Lookup (v2 endpoint)
  console.log(`${colors.cyan}Test 2: Contact Lookup (v2)${colors.reset}`);
  try {
    const testEmail = 'test@example.com';
    const response = await fetch(
      `${baseUrl}/contacts/lookup?email=${encodeURIComponent(testEmail)}&locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓ Contact lookup endpoint works!${colors.reset}`);
      const contacts = data.contacts || [];
      console.log(`  Found ${contacts.length} contact(s) with email: ${testEmail}`);
      testsPassed++;
    } else if (response.status === 404) {
      console.log(`${colors.green}✓ Contact lookup works (no contact found - expected)${colors.reset}`);
      testsPassed++;
    } else {
      const errorText = await response.text();
      console.error(`${colors.red}✗ Contact lookup failed${colors.reset}`);
      console.error(`  Status: ${response.status}`);
      console.error(`  Error: ${errorText.substring(0, 200)}`);
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Network error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Test 3: Create Test Contact (v2)
  console.log(`${colors.cyan}Test 3: Create Test Contact (v2)${colors.reset}`);
  const testContact = {
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}@dtfeditor.com`,
    phone: '+15555551234',
    locationId: locationId,
    tags: ['test-contact', 'api-test-v2'],
    source: 'API Test Script v2'
  };

  try {
    const response = await fetch(`${baseUrl}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testContact)
    });

    if (response.ok) {
      const data = await response.json();
      const contactId = data.contact?.id || data.id;
      console.log(`${colors.green}✓ Successfully created test contact!${colors.reset}`);
      console.log(`  Contact ID: ${contactId || 'N/A'}`);
      console.log(`  Email: ${testContact.email}`);
      testsPassed++;
      
      // Try to delete the test contact
      if (contactId) {
        console.log(`  Cleaning up test contact...`);
        const deleteResponse = await fetch(`${baseUrl}/contacts/${contactId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-07-28'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`  ${colors.green}✓ Test contact deleted${colors.reset}`);
        } else {
          console.log(`  ${colors.yellow}⚠ Could not delete test contact${colors.reset}`);
        }
      }
    } else {
      const errorText = await response.text();
      console.error(`${colors.red}✗ Failed to create test contact${colors.reset}`);
      console.error(`  Status: ${response.status} ${response.statusText}`);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) console.error(`  Error: ${errorData.message}`);
        if (errorData.errors) console.error(`  Details:`, JSON.stringify(errorData.errors, null, 2));
      } catch {
        console.error(`  Response: ${errorText.substring(0, 200)}`);
      }
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Network error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Test 4: Custom Fields (v2)
  console.log(`${colors.cyan}Test 4: Get Custom Fields (v2)${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/locations/${locationId}/customFields`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const fields = data.customFields || data || [];
      console.log(`${colors.green}✓ Successfully fetched custom fields${colors.reset}`);
      console.log(`  Total custom fields: ${fields.length}`);
      if (fields.length > 0) {
        console.log(`  Sample fields:`);
        fields.slice(0, 3).forEach(field => {
          console.log(`    - ${field.name || field.fieldKey} (${field.dataType || field.type || 'text'})`);
        });
      }
      testsPassed++;
    } else {
      console.log(`${colors.yellow}⚠ Could not fetch custom fields (${response.status})${colors.reset}`);
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Network error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log(`${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}           Test Summary${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
  
  if (testsPassed > 0 && testsFailed === 0) {
    console.log(`${colors.green}✓ All tests passed! (${testsPassed}/${testsPassed + testsFailed})${colors.reset}`);
    console.log(`${colors.green}✓ GoHighLevel API v2 connection is working!${colors.reset}`);
    console.log(`${colors.green}✓ Integration is ready to use!${colors.reset}`);
  } else if (testsPassed > 0) {
    console.log(`${colors.yellow}⚠ Partial success: ${testsPassed} passed, ${testsFailed} failed${colors.reset}`);
    console.log(`${colors.yellow}Some API features are working, but there may be issues${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ All tests failed (${testsFailed} tests)${colors.reset}`);
    console.log(`${colors.red}API connection is not working properly${colors.reset}`);
    
    console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
    console.log('1. Verify the API key is valid and not expired');
    console.log('2. Check if this is the correct type of API key (Company vs Location)');
    console.log('3. Ensure the Location ID matches your account');
    console.log('4. Try generating a new API key from GoHighLevel');
  }
}

// Run the test
testHighLevelV2().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});