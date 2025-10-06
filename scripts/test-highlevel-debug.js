#!/usr/bin/env node

/**
 * Debug script for GoHighLevel API connection
 * This provides more detailed debugging information
 */

// Try loading from multiple env files
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env' });

const fetch = require('node-fetch');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function debugHighLevelConnection() {
  console.log(
    `${colors.cyan}======================================${colors.reset}`
  );
  console.log(`${colors.cyan}   GoHighLevel API Debug Test${colors.reset}`);
  console.log(
    `${colors.cyan}======================================${colors.reset}\n`
  );

  const apiKey = process.env.GOHIGHLEVEL_API_KEY || process.env.GHL_API_KEY;
  const locationId =
    process.env.GOHIGHLEVEL_LOCATION_ID || process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error(`${colors.red}Missing API credentials${colors.reset}`);
    return;
  }

  // Decode JWT to see its contents (without verification)
  console.log(`${colors.blue}JWT Token Analysis:${colors.reset}`);
  try {
    const parts = apiKey.split('.');
    if (parts.length === 3) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      console.log(`${colors.magenta}Header:${colors.reset}`, header);
      console.log(`${colors.magenta}Payload:${colors.reset}`, {
        ...payload,
        iat: payload.iat ? new Date(payload.iat).toISOString() : undefined,
        exp: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : undefined,
      });

      // Check if token is expired
      if (payload.exp) {
        const now = Date.now() / 1000;
        if (payload.exp < now) {
          console.log(
            `${colors.red}⚠ Token appears to be expired!${colors.reset}`
          );
        }
      }

      // Check if this is a company/agency token or location token
      if (payload.company_id) {
        console.log(
          `${colors.yellow}This appears to be a Company/Agency level token${colors.reset}`
        );
        console.log(`Company ID: ${payload.company_id}`);
      }
      if (payload.location_id) {
        console.log(
          `${colors.yellow}This appears to be a Location level token${colors.reset}`
        );
        console.log(`Token Location ID: ${payload.location_id}`);
        if (payload.location_id !== locationId) {
          console.log(
            `${colors.red}⚠ Token location ID doesn't match configured location ID!${colors.reset}`
          );
        }
      }
    }
  } catch (e) {
    console.log(`${colors.yellow}Could not decode JWT${colors.reset}`);
  }

  console.log(
    `\n${colors.blue}Testing Different API Endpoints:${colors.reset}\n`
  );

  // Test different API endpoints
  const endpoints = [
    'https://services.leadconnectorhq.com',
    'https://rest.gohighlevel.com',
    'https://api.gohighlevel.com',
    'https://api.msgsndr.com',
  ];

  for (const baseUrl of endpoints) {
    console.log(`${colors.cyan}Testing: ${baseUrl}${colors.reset}`);

    try {
      // Try different auth methods
      const authMethods = [
        { name: 'Bearer Token', header: { Authorization: `Bearer ${apiKey}` } },
        { name: 'X-API-Key', header: { 'X-API-Key': apiKey } },
        { name: 'Api-Key', header: { 'Api-Key': apiKey } },
      ];

      for (const method of authMethods) {
        process.stdout.write(`  ${method.name}: `);

        const response = await fetch(`${baseUrl}/locations/${locationId}`, {
          method: 'GET',
          headers: {
            ...method.header,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Version: '2021-07-28',
          },
          timeout: 5000,
        }).catch(err => ({
          ok: false,
          status: 'Network Error',
          statusText: err.message,
        }));

        if (response.ok) {
          console.log(`${colors.green}✓ SUCCESS!${colors.reset}`);
          const data = await response.json();
          console.log(
            `    Location Name: ${data.name || data.companyName || 'N/A'}`
          );
          console.log(
            `    ${colors.green}This endpoint and auth method work!${colors.reset}`
          );

          // Save working configuration
          console.log(
            `\n${colors.green}Working Configuration Found:${colors.reset}`
          );
          console.log(`  Base URL: ${baseUrl}`);
          console.log(`  Auth Method: ${method.name}`);
          console.log(`  Location ID: ${locationId}`);

          return;
        } else {
          console.log(
            `${colors.red}✗ ${response.status} ${response.statusText}${colors.reset}`
          );
        }
      }
    } catch (error) {
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    }
    console.log();
  }

  // If we get here, nothing worked
  console.log(
    `${colors.red}======================================${colors.reset}`
  );
  console.log(`${colors.red}   No Working Configuration Found${colors.reset}`);
  console.log(
    `${colors.red}======================================${colors.reset}\n`
  );

  console.log(`${colors.yellow}Troubleshooting Steps:${colors.reset}`);
  console.log('1. Verify the API key is from the correct GoHighLevel account');
  console.log('2. Check if this is an agency-level or location-level API key');
  console.log('3. Ensure the API key has the necessary permissions');
  console.log('4. Try regenerating the API key from GoHighLevel');
  console.log('5. Contact GoHighLevel support if the issue persists');

  console.log(`\n${colors.cyan}Additional Information:${colors.reset}`);
  console.log(
    '- GoHighLevel API Docs: https://highlevel.stoplight.io/docs/integrations/'
  );
  console.log('- Different API keys work with different endpoints');
  console.log('- Agency keys vs Location keys have different scopes');
}

// Run the debug test
debugHighLevelConnection().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
  process.exit(1);
});
