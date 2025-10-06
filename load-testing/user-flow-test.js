#!/usr/bin/env node

/**
 * User Flow Load Testing - Tests realistic user journeys
 * Free tool using only Node.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Test configuration
const CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  testUsers: parseInt(process.env.TEST_USERS) || 5,
  testEmail: process.env.TEST_EMAIL || 'loadtest',
  testPassword: process.env.TEST_PASSWORD || 'TestPassword123!',
};

// Test results
const results = {
  flows: [],
  summary: {
    total: 0,
    successful: 0,
    failed: 0,
  },
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Make HTTP request with proper headers and cookies
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const parsedUrl = new URL(url);
    const module = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + (parsedUrl.search || ''),
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'DTF-LoadTest/1.0',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 30000, // 30 second timeout for image processing
    };

    const req = module.request(requestOptions, res => {
      let data = '';
      const chunks = [];

      res.on('data', chunk => {
        data += chunk;
        chunks.push(chunk);
      });

      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Extract cookies for session management
        const cookies = res.headers['set-cookie'] || [];

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          cookies,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Test user signup flow
 */
async function testSignupFlow(userId) {
  const flowResult = {
    user: `User-${userId}`,
    flow: 'Signup',
    steps: [],
    totalTime: 0,
    success: false,
  };

  const email = `${CONFIG.testEmail}+${userId}+${Date.now()}@example.com`;

  try {
    console.log(
      `${colors.cyan}[User ${userId}] Starting signup flow${colors.reset}`
    );

    // Step 1: Load signup page
    const signupPage = await makeRequest(`${CONFIG.baseUrl}/signup`);
    flowResult.steps.push({
      name: 'Load Signup Page',
      time: signupPage.responseTime,
      success: signupPage.success,
    });

    // Step 2: Submit signup form
    const signupData = {
      email,
      password: CONFIG.testPassword,
      firstName: `Test${userId}`,
      lastName: `User${userId}`,
    };

    const signupResponse = await makeRequest(
      `${CONFIG.baseUrl}/api/auth/signup`,
      {
        method: 'POST',
        body: JSON.stringify(signupData),
      }
    );

    flowResult.steps.push({
      name: 'Submit Signup',
      time: signupResponse.responseTime,
      success: signupResponse.success,
    });

    // Calculate total time
    flowResult.totalTime = flowResult.steps.reduce(
      (sum, step) => sum + step.time,
      0
    );
    flowResult.success = flowResult.steps.every(step => step.success);

    console.log(
      `${colors.green}[User ${userId}] Signup completed in ${flowResult.totalTime.toFixed(2)}ms${colors.reset}`
    );
  } catch (error) {
    console.log(
      `${colors.red}[User ${userId}] Signup failed: ${error.message}${colors.reset}`
    );
    flowResult.error = error.message;
  }

  return flowResult;
}

/**
 * Test image processing flow
 */
async function testImageProcessingFlow(userId) {
  const flowResult = {
    user: `User-${userId}`,
    flow: 'Image Processing',
    steps: [],
    totalTime: 0,
    success: false,
  };

  try {
    console.log(
      `${colors.cyan}[User ${userId}] Starting image processing flow${colors.reset}`
    );

    // Step 1: Load process page
    const processPage = await makeRequest(`${CONFIG.baseUrl}/process`);
    flowResult.steps.push({
      name: 'Load Process Page',
      time: processPage.responseTime,
      success: processPage.success,
    });

    // Step 2: Simulate image upload (using a small test image)
    // In a real test, you'd upload an actual image file
    const uploadResponse = await makeRequest(`${CONFIG.baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: 'mock-image-data', // Simplified for testing
    });

    flowResult.steps.push({
      name: 'Upload Image',
      time: uploadResponse.responseTime,
      success: uploadResponse.success,
    });

    // Step 3: Load upscale page
    const upscalePage = await makeRequest(
      `${CONFIG.baseUrl}/process/upscale?imageId=test`
    );
    flowResult.steps.push({
      name: 'Load Upscale Page',
      time: upscalePage.responseTime,
      success: upscalePage.success,
    });

    flowResult.totalTime = flowResult.steps.reduce(
      (sum, step) => sum + step.time,
      0
    );
    flowResult.success = flowResult.steps.every(step => step.success);

    console.log(
      `${colors.green}[User ${userId}] Image flow completed in ${flowResult.totalTime.toFixed(2)}ms${colors.reset}`
    );
  } catch (error) {
    console.log(
      `${colors.red}[User ${userId}] Image flow failed: ${error.message}${colors.reset}`
    );
    flowResult.error = error.message;
  }

  return flowResult;
}

/**
 * Test critical page loads
 */
async function testPageLoads(userId) {
  const flowResult = {
    user: `User-${userId}`,
    flow: 'Page Loads',
    steps: [],
    totalTime: 0,
    success: false,
  };

  const pages = [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Process', path: '/process' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'About', path: '/about' },
  ];

  try {
    console.log(
      `${colors.cyan}[User ${userId}] Testing page loads${colors.reset}`
    );

    for (const page of pages) {
      const response = await makeRequest(`${CONFIG.baseUrl}${page.path}`);
      flowResult.steps.push({
        name: page.name,
        time: response.responseTime,
        success: response.success,
        statusCode: response.statusCode,
      });
    }

    flowResult.totalTime = flowResult.steps.reduce(
      (sum, step) => sum + step.time,
      0
    );
    flowResult.success = flowResult.steps.every(step => step.success);

    console.log(
      `${colors.green}[User ${userId}] Page loads completed in ${flowResult.totalTime.toFixed(2)}ms${colors.reset}`
    );
  } catch (error) {
    console.log(
      `${colors.red}[User ${userId}] Page loads failed: ${error.message}${colors.reset}`
    );
    flowResult.error = error.message;
  }

  return flowResult;
}

/**
 * Print test results
 */
function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}USER FLOW LOAD TEST RESULTS${colors.reset}`);
  console.log('='.repeat(70));

  // Group results by flow type
  const flowGroups = {};
  results.flows.forEach(flow => {
    if (!flowGroups[flow.flow]) {
      flowGroups[flow.flow] = [];
    }
    flowGroups[flow.flow].push(flow);
  });

  // Print results for each flow type
  Object.entries(flowGroups).forEach(([flowName, flows]) => {
    console.log(`\n${colors.bright}${flowName}:${colors.reset}`);

    const successful = flows.filter(f => f.success).length;
    const failed = flows.length - successful;
    const times = flows.map(f => f.totalTime).filter(t => t > 0);

    console.log(
      `  Success Rate: ${successful}/${flows.length} (${((successful / flows.length) * 100).toFixed(1)}%)`
    );

    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`  Response Times:`);
      console.log(`    Min: ${minTime.toFixed(2)}ms`);
      console.log(`    Avg: ${avgTime.toFixed(2)}ms`);
      console.log(`    Max: ${maxTime.toFixed(2)}ms`);
    }

    // Show step breakdown
    const stepTimes = {};
    flows.forEach(flow => {
      flow.steps.forEach(step => {
        if (!stepTimes[step.name]) {
          stepTimes[step.name] = [];
        }
        stepTimes[step.name].push(step.time);
      });
    });

    console.log(`  Step Breakdown:`);
    Object.entries(stepTimes).forEach(([stepName, times]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`    ${stepName}: ${avg.toFixed(2)}ms avg`);
    });

    // Show errors if any
    const errors = flows.filter(f => f.error);
    if (errors.length > 0) {
      console.log(`  ${colors.red}Errors:${colors.reset}`);
      errors.forEach(e => {
        console.log(`    ${e.user}: ${e.error}`);
      });
    }
  });

  // Overall summary
  console.log(`\n${colors.bright}Overall Summary:${colors.reset}`);
  const allSuccessful = results.flows.filter(f => f.success).length;
  const allFailed = results.flows.length - allSuccessful;

  console.log(`  Total Flows Tested: ${results.flows.length}`);
  console.log(`  ${colors.green}Successful: ${allSuccessful}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${allFailed}${colors.reset}`);
  console.log(
    `  Success Rate: ${((allSuccessful / results.flows.length) * 100).toFixed(1)}%`
  );

  // Performance Assessment
  console.log(`\n${colors.bright}Performance Assessment:${colors.reset}`);
  const successRate = allSuccessful / results.flows.length;

  if (successRate >= 0.99) {
    console.log(
      `  ${colors.green}✓ Excellent: 99%+ success rate${colors.reset}`
    );
  } else if (successRate >= 0.95) {
    console.log(`  ${colors.yellow}⚠ Good: 95%+ success rate${colors.reset}`);
  } else {
    console.log(
      `  ${colors.red}✗ Needs Improvement: <95% success rate${colors.reset}`
    );
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Main test runner
 */
async function runUserFlowTests() {
  console.log(`${colors.bright}Starting User Flow Load Tests${colors.reset}`);
  console.log(`Testing: ${CONFIG.baseUrl}`);
  console.log(`Simulating ${CONFIG.testUsers} users\n`);

  const startTime = Date.now();

  // Run tests for each user
  const promises = [];

  for (let i = 1; i <= CONFIG.testUsers; i++) {
    // Test different flows for different users
    if (i % 3 === 0) {
      promises.push(testSignupFlow(i).then(r => results.flows.push(r)));
    } else if (i % 3 === 1) {
      promises.push(
        testImageProcessingFlow(i).then(r => results.flows.push(r))
      );
    } else {
      promises.push(testPageLoads(i).then(r => results.flows.push(r)));
    }

    // Small delay between starting users
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Wait for all tests to complete
  await Promise.all(promises);

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`\nAll tests completed in ${duration.toFixed(2)} seconds`);

  // Print results
  printResults();

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `./load-testing/reports/user-flow-${timestamp}.json`;

  // Create reports directory if it doesn't exist
  if (!fs.existsSync('./load-testing/reports')) {
    fs.mkdirSync('./load-testing/reports', { recursive: true });
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        config: CONFIG,
        results,
        duration,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted. Generating partial results...\n');
  printResults();
  process.exit(0);
});

// Run the tests
runUserFlowTests().catch(console.error);
