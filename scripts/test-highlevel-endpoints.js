#!/usr/bin/env node

/**
 * Test different GoHighLevel endpoints to find working configuration
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function testEndpoints() {
  const apiKey = process.env.GOHIGHLEVEL_API_KEY;
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('Missing API credentials');
    return;
  }

  console.log(`${colors.cyan}Testing GoHighLevel Endpoints${colors.reset}\n`);

  // Different base URLs to test
  const baseUrls = [
    'https://rest.gohighlevel.com/v1',
    'https://api.gohighlevel.com/v2',
    'https://services.leadconnectorhq.com',
    'https://api.leadconnectorhq.com',
  ];

  // Different endpoints to test
  const endpoints = [
    '/locations/{locationId}',
    '/location/{locationId}',
    '/contacts',
    '/contacts/',
    '/users/search',
  ];

  for (const baseUrl of baseUrls) {
    console.log(`${colors.cyan}Testing base URL: ${baseUrl}${colors.reset}`);

    for (const endpoint of endpoints) {
      const url = `${baseUrl}${endpoint.replace('{locationId}', locationId)}`;
      process.stdout.write(`  ${endpoint}: `);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 3000,
        });

        if (response.ok) {
          console.log(`${colors.green}✓ 200 OK${colors.reset}`);

          // Try to get a sample of the response
          try {
            const data = await response.json();
            console.log(
              `    Response sample:`,
              JSON.stringify(data).substring(0, 100)
            );
          } catch (e) {
            // Ignore JSON parse errors
          }
        } else if (response.status === 404) {
          console.log(`${colors.yellow}404 Not Found${colors.reset}`);
        } else if (response.status === 401) {
          const errorText = await response.text();
          if (errorText.includes('Invalid JWT')) {
            console.log(`${colors.red}401 Invalid JWT${colors.reset}`);
          } else {
            console.log(`${colors.red}401 Unauthorized${colors.reset}`);
          }
        } else {
          console.log(
            `${colors.red}${response.status} ${response.statusText}${colors.reset}`
          );
        }
      } catch (error) {
        console.log(`${colors.red}Network error${colors.reset}`);
      }
    }
    console.log();
  }

  // Test with different auth headers
  console.log(
    `${colors.cyan}Testing different auth methods with services.leadconnectorhq.com${colors.reset}`
  );
  const authMethods = [
    { name: 'Bearer', header: { Authorization: `Bearer ${apiKey}` } },
    { name: 'Api-Key', header: { 'Api-Key': apiKey } },
    { name: 'X-API-Key', header: { 'X-API-Key': apiKey } },
  ];

  for (const method of authMethods) {
    process.stdout.write(`  ${method.name}: `);
    try {
      const response = await fetch(
        `https://services.leadconnectorhq.com/locations/${locationId}`,
        {
          headers: {
            ...method.header,
            Accept: 'application/json',
          },
          timeout: 3000,
        }
      );

      if (response.ok) {
        console.log(`${colors.green}✓ Works!${colors.reset}`);
      } else {
        console.log(`${colors.red}${response.status}${colors.reset}`);
      }
    } catch (e) {
      console.log(`${colors.red}Error${colors.reset}`);
    }
  }
}

testEndpoints().catch(console.error);
