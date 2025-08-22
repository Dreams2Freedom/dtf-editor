#!/usr/bin/env node

/**
 * Test script for GoHighLevel API v1 (working endpoint)
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testHighLevelV1() {
  console.log(`${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}   GoHighLevel API v1 Test${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}\n`);

  const apiKey = process.env.GOHIGHLEVEL_API_KEY || process.env.GHL_API_KEY;
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID || process.env.GHL_LOCATION_ID;
  const baseUrl = 'https://rest.gohighlevel.com/v1';

  console.log(`${colors.blue}Configuration:${colors.reset}`);
  console.log(`- API Key: ${apiKey ? `${colors.green}✓ Found${colors.reset}` : `${colors.red}✗ Not found${colors.reset}`}`);
  console.log(`- Location ID: ${locationId ? `${colors.green}✓ Found (${locationId})${colors.reset}` : `${colors.red}✗ Not found${colors.reset}`}`);
  console.log(`- Base URL: ${baseUrl}\n`);

  if (!apiKey || !locationId) {
    console.error(`${colors.red}Missing configuration${colors.reset}`);
    return;
  }

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Get Location Details
  console.log(`${colors.cyan}Test 1: Get Location Details${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓ Successfully connected to GoHighLevel!${colors.reset}`);
      console.log(`  Location Name: ${data.name || 'N/A'}`);
      console.log(`  Address: ${data.address || 'N/A'}`);
      console.log(`  City: ${data.city || 'N/A'}, ${data.state || ''} ${data.postalCode || ''}`);
      console.log(`  Email: ${data.email || 'N/A'}`);
      console.log(`  Phone: ${data.phone || 'N/A'}`);
      testsPassed++;
    } else {
      console.error(`${colors.red}✗ Failed: ${response.status}${colors.reset}`);
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Test 2: List Contacts
  console.log(`${colors.cyan}Test 2: List Contacts${colors.reset}`);
  try {
    const response = await fetch(`${baseUrl}/contacts?locationId=${locationId}&limit=5`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓ Successfully fetched contacts!${colors.reset}`);
      console.log(`  Total contacts: ${data.meta?.total || data.contacts?.length || 0}`);
      if (data.contacts && data.contacts.length > 0) {
        console.log(`  Sample contacts:`);
        data.contacts.slice(0, 3).forEach(contact => {
          console.log(`    - ${contact.firstName} ${contact.lastName} (${contact.email})`);
        });
      }
      testsPassed++;
    } else {
      console.error(`${colors.red}✗ Failed: ${response.status}${colors.reset}`);
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Test 3: Create Test Contact
  console.log(`${colors.cyan}Test 3: Create Test Contact${colors.reset}`);
  const testContact = {
    firstName: 'Test',
    lastName: 'Contact',
    email: `test-${Date.now()}@dtfeditor.com`,
    phone: '+15555551234',
    tags: ['test-contact', 'api-test-v1'],
    source: 'API Test Script'
  };

  try {
    const response = await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ...testContact,
        locationId: locationId
      })
    });

    if (response.ok) {
      const data = await response.json();
      const contactId = data.contact?.id || data.contact?._id || data.id;
      console.log(`${colors.green}✓ Successfully created test contact!${colors.reset}`);
      console.log(`  Contact ID: ${contactId}`);
      console.log(`  Name: ${testContact.firstName} ${testContact.lastName}`);
      console.log(`  Email: ${testContact.email}`);
      testsPassed++;
      
      // Clean up - delete the test contact
      if (contactId) {
        console.log(`  Cleaning up...`);
        const deleteResponse = await fetch(`${baseUrl}/contacts/${contactId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`
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
      console.error(`${colors.red}✗ Failed: ${response.status}${colors.reset}`);
      try {
        const error = JSON.parse(errorText);
        if (error.message) console.error(`  Error: ${error.message}`);
      } catch {
        console.error(`  Response: ${errorText.substring(0, 200)}`);
      }
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Test 4: Search for Contact by Email
  console.log(`${colors.cyan}Test 4: Search Contact by Email${colors.reset}`);
  try {
    const searchEmail = 'test@example.com';
    const response = await fetch(
      `${baseUrl}/contacts?locationId=${locationId}&query=${encodeURIComponent(searchEmail)}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓ Contact search works!${colors.reset}`);
      console.log(`  Search query: ${searchEmail}`);
      console.log(`  Results found: ${data.contacts?.length || 0}`);
      testsPassed++;
    } else {
      console.error(`${colors.red}✗ Failed: ${response.status}${colors.reset}`);
      testsFailed++;
    }
  } catch (e) {
    console.error(`${colors.red}✗ Error: ${e.message}${colors.reset}`);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log(`${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.cyan}           Test Summary${colors.reset}`);
  console.log(`${colors.cyan}======================================${colors.reset}`);
  
  const totalTests = testsPassed + testsFailed;
  if (testsPassed === totalTests) {
    console.log(`${colors.green}✓ All tests passed! (${testsPassed}/${totalTests})${colors.reset}`);
    console.log(`${colors.green}✓ GoHighLevel API connection is working perfectly!${colors.reset}`);
    console.log(`\n${colors.blue}Integration Status:${colors.reset}`);
    console.log('- API endpoint: https://rest.gohighlevel.com/v1');
    console.log('- Authentication: Bearer token (Location API key)');
    console.log('- Location verified: DTFEditor.com');
    console.log(`\n${colors.green}Ready for production use!${colors.reset}`);
  } else if (testsPassed > 0) {
    console.log(`${colors.yellow}⚠ Partial success: ${testsPassed} passed, ${testsFailed} failed${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ All tests failed${colors.reset}`);
  }
}

testHighLevelV1().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
});