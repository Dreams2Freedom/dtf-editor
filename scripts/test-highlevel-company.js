#!/usr/bin/env node

/**
 * Test script for GoHighLevel Company/Agency API
 * This tests company-level API access
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env' });

const fetch = require('node-fetch');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testCompanyAPI() {
  console.log(
    `${colors.cyan}======================================${colors.reset}`
  );
  console.log(`${colors.cyan}  GoHighLevel Company API Test${colors.reset}`);
  console.log(
    `${colors.cyan}======================================${colors.reset}\n`
  );

  const apiKey = process.env.GOHIGHLEVEL_API_KEY;
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID;
  const baseUrl = 'https://services.leadconnectorhq.com';

  if (!apiKey) {
    console.error(`${colors.red}API Key not found${colors.reset}`);
    return;
  }

  console.log(`${colors.blue}Configuration:${colors.reset}`);
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);
  console.log(`Location ID: ${locationId}\n`);

  // Test 1: Try to get company information
  console.log(`${colors.cyan}Test 1: Get Company Information${colors.reset}`);
  try {
    const companyResponse = await fetch(`${baseUrl}/companies/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    });

    if (companyResponse.ok) {
      const data = await companyResponse.json();
      console.log(`${colors.green}✓ Company API access works!${colors.reset}`);
      console.log(
        `  Company data:`,
        JSON.stringify(data, null, 2).substring(0, 200)
      );
    } else {
      const error = await companyResponse.text();
      console.log(
        `${colors.red}✗ Company API failed: ${companyResponse.status}${colors.reset}`
      );
      console.log(`  Error:`, error.substring(0, 200));
    }
  } catch (e) {
    console.log(
      `${colors.red}✗ Company API error: ${e.message}${colors.reset}`
    );
  }

  // Test 2: Try to list all locations under the company
  console.log(`\n${colors.cyan}Test 2: List Company Locations${colors.reset}`);
  try {
    const locationsResponse = await fetch(`${baseUrl}/locations/search`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    });

    if (locationsResponse.ok) {
      const data = await locationsResponse.json();
      console.log(`${colors.green}✓ Can list locations!${colors.reset}`);
      const locations = data.locations || data || [];
      console.log(`  Found ${locations.length} location(s)`);

      if (locations.length > 0) {
        locations.slice(0, 3).forEach(loc => {
          console.log(
            `  - ${loc.name || loc.companyName} (ID: ${loc.id || loc._id})`
          );
        });
      }
    } else {
      const error = await locationsResponse.text();
      console.log(
        `${colors.red}✗ Locations API failed: ${locationsResponse.status}${colors.reset}`
      );
      console.log(`  Error:`, error.substring(0, 200));
    }
  } catch (e) {
    console.log(
      `${colors.red}✗ Locations API error: ${e.message}${colors.reset}`
    );
  }

  // Test 3: Try OAuth/Auth endpoints
  console.log(
    `\n${colors.cyan}Test 3: Test OAuth/Auth Endpoints${colors.reset}`
  );
  try {
    const oauthResponse = await fetch(`${baseUrl}/oauth/locationToken`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        companyId: 'kppne4yzyA2VRIDHXw6X',
        locationId: locationId,
      }),
    });

    if (oauthResponse.ok) {
      const data = await oauthResponse.json();
      console.log(`${colors.green}✓ Can get location token!${colors.reset}`);
      console.log(`  Token received:`, data.access_token ? 'Yes' : 'No');

      if (data.access_token) {
        // Test the location token
        console.log(
          `\n${colors.cyan}Testing with location token...${colors.reset}`
        );
        const locationTokenTest = await fetch(
          `${baseUrl}/locations/${locationId}`,
          {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
              Version: '2021-07-28',
            },
          }
        );

        if (locationTokenTest.ok) {
          const locData = await locationTokenTest.json();
          console.log(`${colors.green}✓ Location token works!${colors.reset}`);
          console.log(`  Location: ${locData.name || locData.companyName}`);

          // Save the working token
          console.log(
            `\n${colors.green}======================================${colors.reset}`
          );
          console.log(
            `${colors.green}  SUCCESS! Working Configuration Found${colors.reset}`
          );
          console.log(
            `${colors.green}======================================${colors.reset}`
          );
          console.log(
            `\nYou need to use this location-specific token for API calls:`
          );
          console.log(`${colors.yellow}${data.access_token}${colors.reset}`);
          console.log(
            `\nThis token should be used instead of the company token for location-specific operations.`
          );
        }
      }
    } else {
      const error = await oauthResponse.text();
      console.log(
        `${colors.red}✗ OAuth endpoint failed: ${oauthResponse.status}${colors.reset}`
      );
      console.log(`  Error:`, error.substring(0, 200));
    }
  } catch (e) {
    console.log(`${colors.red}✗ OAuth error: ${e.message}${colors.reset}`);
  }

  // Test 4: Try the Users API
  console.log(`\n${colors.cyan}Test 4: Test Users API${colors.reset}`);
  try {
    const usersResponse = await fetch(`${baseUrl}/users/`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    });

    if (usersResponse.ok) {
      const data = await usersResponse.json();
      console.log(`${colors.green}✓ Users API works!${colors.reset}`);
      const users = data.users || data || [];
      console.log(`  Found ${users.length} user(s)`);
    } else {
      const error = await usersResponse.text();
      console.log(
        `${colors.red}✗ Users API failed: ${usersResponse.status}${colors.reset}`
      );
    }
  } catch (e) {
    console.log(`${colors.red}✗ Users API error: ${e.message}${colors.reset}`);
  }

  console.log(
    `\n${colors.cyan}======================================${colors.reset}`
  );
  console.log(`${colors.cyan}           Summary${colors.reset}`);
  console.log(
    `${colors.cyan}======================================${colors.reset}`
  );

  console.log(
    `\nYour API key is a ${colors.yellow}Company/Agency level token${colors.reset}.`
  );
  console.log(
    `\nFor location-specific operations (like creating contacts), you need to:`
  );
  console.log(`1. Use the company token to get a location-specific token`);
  console.log(`2. Use that location token for API calls`);
  console.log(`\nAlternatively, you can:`);
  console.log(`1. Go to the specific location in GoHighLevel`);
  console.log(`2. Generate an API key directly from that location's settings`);
  console.log(`3. Use that location-specific API key instead`);
}

testCompanyAPI().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
});
