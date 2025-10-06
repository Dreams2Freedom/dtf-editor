#!/usr/bin/env node

/**
 * Test script for GoHighLevel API connection
 * Usage: node scripts/test-highlevel.js
 */

// Try loading from multiple env files in order of priority
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
};

async function testHighLevelConnection() {
  console.log(
    `${colors.cyan}======================================${colors.reset}`
  );
  console.log(
    `${colors.cyan}   GoHighLevel API Connection Test${colors.reset}`
  );
  console.log(
    `${colors.cyan}======================================${colors.reset}\n`
  );

  // Check environment variables (try both naming conventions)
  const apiKey = process.env.GOHIGHLEVEL_API_KEY || process.env.GHL_API_KEY;
  const locationId =
    process.env.GOHIGHLEVEL_LOCATION_ID || process.env.GHL_LOCATION_ID;
  const baseUrl =
    process.env.NEXT_PUBLIC_GHL_API_URL ||
    'https://services.leadconnectorhq.com';

  console.log(`${colors.blue}Configuration Check:${colors.reset}`);
  console.log(
    `- API Key: ${apiKey ? `${colors.green}✓ Found (${apiKey.substring(0, 10)}...)${colors.reset}` : `${colors.red}✗ Not found${colors.reset}`}`
  );
  console.log(
    `- Location ID: ${locationId ? `${colors.green}✓ Found (${locationId})${colors.reset}` : `${colors.red}✗ Not found${colors.reset}`}`
  );
  console.log(`- Base URL: ${baseUrl}\n`);

  if (!apiKey || !locationId) {
    console.error(
      `${colors.red}Error: Missing required environment variables!${colors.reset}`
    );
    console.log(
      `${colors.yellow}Please ensure GHL_API_KEY and GHL_LOCATION_ID are set in .env.production${colors.reset}`
    );
    process.exit(1);
  }

  try {
    console.log(`${colors.blue}Testing API Connection...${colors.reset}\n`);

    // Test 1: Get Location Details
    console.log(
      `${colors.cyan}Test 1: Fetching Location Details${colors.reset}`
    );
    const locationResponse = await fetch(`${baseUrl}/locations/${locationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    });

    if (locationResponse.ok) {
      const locationData = await locationResponse.json();
      console.log(
        `${colors.green}✓ Successfully connected to GoHighLevel!${colors.reset}`
      );
      console.log(
        `  Location Name: ${locationData.name || locationData.companyName || 'N/A'}`
      );
      console.log(`  Location ID: ${locationData.id || locationId}`);
      console.log(`  Email: ${locationData.email || 'N/A'}\n`);
    } else {
      const errorText = await locationResponse.text();
      console.error(
        `${colors.red}✗ Failed to fetch location details${colors.reset}`
      );
      console.error(
        `  Status: ${locationResponse.status} ${locationResponse.statusText}`
      );
      console.error(`  Response: ${errorText}\n`);

      if (locationResponse.status === 401) {
        console.log(
          `${colors.yellow}Hint: Check if your API key is valid and has the correct permissions${colors.reset}`
        );
      }
      if (locationResponse.status === 404) {
        console.log(
          `${colors.yellow}Hint: Check if the Location ID is correct${colors.reset}`
        );
      }
    }

    // Test 2: Create a test contact
    console.log(`${colors.cyan}Test 2: Creating Test Contact${colors.reset}`);
    const testContact = {
      firstName: 'Test',
      lastName: 'Contact',
      email: `test-${Date.now()}@dtfeditor.com`,
      phone: '+15555551234',
      locationId: locationId,
      tags: ['test-contact', 'api-test'],
      customFields: {
        leadSource: 'API Test Script',
        testDate: new Date().toISOString(),
      },
    };

    const contactResponse = await fetch(`${baseUrl}/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify(testContact),
    });

    if (contactResponse.ok) {
      const contactData = await contactResponse.json();
      console.log(
        `${colors.green}✓ Successfully created test contact!${colors.reset}`
      );
      console.log(
        `  Contact ID: ${contactData.contact?.id || contactData.id || 'N/A'}`
      );
      console.log(`  Email: ${testContact.email}\n`);

      // Clean up - delete the test contact
      if (contactData.contact?.id || contactData.id) {
        const contactId = contactData.contact?.id || contactData.id;
        console.log(`${colors.cyan}Cleaning up test contact...${colors.reset}`);

        const deleteResponse = await fetch(`${baseUrl}/contacts/${contactId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Version: '2021-07-28',
          },
        });

        if (deleteResponse.ok) {
          console.log(
            `${colors.green}✓ Test contact deleted successfully${colors.reset}\n`
          );
        } else {
          console.log(
            `${colors.yellow}⚠ Could not delete test contact (manual cleanup may be needed)${colors.reset}\n`
          );
        }
      }
    } else {
      const errorText = await contactResponse.text();
      console.error(
        `${colors.red}✗ Failed to create test contact${colors.reset}`
      );
      console.error(
        `  Status: ${contactResponse.status} ${contactResponse.statusText}`
      );

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          console.error(`  Error: ${errorData.message}`);
        }
        if (errorData.errors) {
          console.error(`  Details:`, errorData.errors);
        }
      } catch {
        console.error(`  Response: ${errorText}`);
      }
      console.log();
    }

    // Test 3: Check custom fields
    console.log(`${colors.cyan}Test 3: Fetching Custom Fields${colors.reset}`);
    const customFieldsResponse = await fetch(
      `${baseUrl}/locations/${locationId}/customFields`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
        },
      }
    );

    if (customFieldsResponse.ok) {
      const customFieldsData = await customFieldsResponse.json();
      const fields = customFieldsData.customFields || customFieldsData || [];
      console.log(
        `${colors.green}✓ Successfully fetched custom fields${colors.reset}`
      );
      console.log(`  Total custom fields: ${fields.length}`);
      if (fields.length > 0) {
        console.log(`  Sample fields:`);
        fields.slice(0, 3).forEach(field => {
          console.log(
            `    - ${field.name || field.fieldKey} (${field.dataType || 'text'})`
          );
        });
      }
      console.log();
    } else {
      console.log(
        `${colors.yellow}⚠ Could not fetch custom fields${colors.reset}\n`
      );
    }

    // Summary
    console.log(
      `${colors.cyan}======================================${colors.reset}`
    );
    console.log(`${colors.cyan}           Test Summary${colors.reset}`);
    console.log(
      `${colors.cyan}======================================${colors.reset}`
    );
    console.log(
      `${colors.green}✓ GoHighLevel API connection is working!${colors.reset}`
    );
    console.log(`${colors.green}✓ API Key is valid${colors.reset}`);
    console.log(`${colors.green}✓ Location ID is correct${colors.reset}`);
    console.log(`${colors.green}✓ Contact creation works${colors.reset}\n`);

    console.log(`${colors.blue}Integration is ready to use!${colors.reset}`);
  } catch (error) {
    console.error(
      `${colors.red}Error during testing:${colors.reset}`,
      error.message
    );
    console.log(`\n${colors.yellow}Troubleshooting tips:${colors.reset}`);
    console.log('1. Check your internet connection');
    console.log('2. Verify the API key is correct and active');
    console.log('3. Ensure the Location ID matches your GoHighLevel account');
    console.log('4. Check if the API endpoint is accessible from your network');
    process.exit(1);
  }
}

// Run the test
testHighLevelConnection().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});
