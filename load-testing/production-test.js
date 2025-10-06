#!/usr/bin/env node

/**
 * PRODUCTION Load Testing Script - WITH SAFETY LIMITS
 * This script has built-in safeguards to prevent overloading production
 */

const https = require('https');
const { performance } = require('perf_hooks');

// SAFETY CONFIGURATION FOR PRODUCTION
const CONFIG = {
  baseUrl: 'https://dtfeditor.com',

  // START SMALL - Safety first!
  maxConcurrentUsers: 10, // Never exceed 10 concurrent users
  maxRequestsPerUser: 5, // Maximum 5 requests per user
  delayBetweenRequests: 500, // 500ms delay between requests (slower than local)

  // What to test (override with env vars)
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 3,
  requestsPerUser: parseInt(process.env.REQUESTS_PER_USER) || 3,
};

// Safety checks
if (CONFIG.concurrentUsers > CONFIG.maxConcurrentUsers) {
  console.error(
    `🛑 SAFETY: Limiting concurrent users to ${CONFIG.maxConcurrentUsers} for production`
  );
  CONFIG.concurrentUsers = CONFIG.maxConcurrentUsers;
}

if (CONFIG.requestsPerUser > CONFIG.maxRequestsPerUser) {
  console.error(
    `🛑 SAFETY: Limiting requests per user to ${CONFIG.maxRequestsPerUser} for production`
  );
  CONFIG.requestsPerUser = CONFIG.maxRequestsPerUser;
}

// Test results storage
const results = {
  successful: 0,
  failed: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Production-safe endpoints (avoid heavy operations)
const endpoints = [
  { path: '/', method: 'GET', name: 'Home Page' },
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/pricing', method: 'GET', name: 'Pricing Page' },
  { path: '/about', method: 'GET', name: 'About Page' },
  // NOT testing image processing endpoints in production!
];

/**
 * Make HTTPS request to production
 */
function makeRequest(endpoint) {
  return new Promise(resolve => {
    const startTime = performance.now();

    const options = {
      hostname: 'dtfeditor.com',
      port: 443,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'User-Agent': 'DTF-Production-Test/1.0',
      },
      timeout: 15000, // 15 second timeout for production
    };

    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (res.statusCode >= 200 && res.statusCode < 400) {
          results.successful++;
          results.responseTimes.push({
            endpoint: endpoint.name,
            time: responseTime,
            statusCode: res.statusCode,
          });
        } else {
          results.failed++;
          results.errors.push({
            endpoint: endpoint.name,
            statusCode: res.statusCode,
            error: `HTTP ${res.statusCode}`,
          });
        }

        resolve();
      });
    });

    req.on('error', error => {
      results.failed++;
      results.errors.push({
        endpoint: endpoint.name,
        error: error.message,
      });
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      results.failed++;
      results.errors.push({
        endpoint: endpoint.name,
        error: 'Request timeout',
      });
      resolve();
    });

    req.end();
  });
}

/**
 * Simulate a single user with delays
 */
async function simulateUser(userId) {
  console.log(
    `${colors.cyan}User ${userId} started (with safety delays)${colors.reset}`
  );

  for (let i = 0; i < CONFIG.requestsPerUser; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    await makeRequest(endpoint);

    // SAFETY: Longer delay for production
    await new Promise(resolve =>
      setTimeout(resolve, CONFIG.delayBetweenRequests)
    );
  }

  console.log(`${colors.cyan}User ${userId} completed${colors.reset}`);
}

/**
 * Calculate statistics
 */
function calculateStats() {
  if (results.responseTimes.length === 0) {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      avg: 0,
      min: 0,
      max: 0,
    };
  }

  const times = results.responseTimes.map(r => r.time).sort((a, b) => a - b);

  return {
    p50: times[Math.floor(times.length * 0.5)],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: times[0],
    max: times[times.length - 1],
  };
}

/**
 * Print results with production context
 */
function printResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const totalRequests = results.successful + results.failed;
  const stats = calculateStats();

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}PRODUCTION LOAD TEST RESULTS${colors.reset}`);
  console.log('='.repeat(60));

  console.log(`\n${colors.yellow}⚠️  PRODUCTION ENVIRONMENT${colors.reset}`);
  console.log(`URL: ${CONFIG.baseUrl}`);

  console.log(`\n${colors.bright}Test Configuration:${colors.reset}`);
  console.log(`  Concurrent Users: ${CONFIG.concurrentUsers}`);
  console.log(`  Requests per User: ${CONFIG.requestsPerUser}`);
  console.log(
    `  Safety Delay: ${CONFIG.delayBetweenRequests}ms between requests`
  );
  console.log(`  Duration: ${duration.toFixed(2)} seconds`);

  console.log(`\n${colors.bright}Request Statistics:${colors.reset}`);
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(
    `  ${colors.green}Successful: ${results.successful} (${((results.successful / totalRequests) * 100).toFixed(1)}%)${colors.reset}`
  );
  console.log(
    `  ${colors.red}Failed: ${results.failed} (${((results.failed / totalRequests) * 100).toFixed(1)}%)${colors.reset}`
  );
  console.log(`  Requests/sec: ${(totalRequests / duration).toFixed(2)}`);

  console.log(`\n${colors.bright}Response Times (ms):${colors.reset}`);
  console.log(`  Min: ${stats.min.toFixed(2)}`);
  console.log(`  Avg: ${stats.avg.toFixed(2)}`);
  console.log(`  P50: ${stats.p50.toFixed(2)}`);
  console.log(`  P95: ${stats.p95.toFixed(2)}`);
  console.log(`  P99: ${stats.p99.toFixed(2)}`);
  console.log(`  Max: ${stats.max.toFixed(2)}`);

  // Response times by endpoint
  console.log(`\n${colors.bright}Response Times by Endpoint:${colors.reset}`);
  const endpointStats = {};
  results.responseTimes.forEach(r => {
    if (!endpointStats[r.endpoint]) {
      endpointStats[r.endpoint] = [];
    }
    endpointStats[r.endpoint].push(r.time);
  });

  Object.entries(endpointStats).forEach(([endpoint, times]) => {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(
      `  ${endpoint}: ${avg.toFixed(2)}ms (${times.length} requests)`
    );
  });

  // Show errors if any
  if (results.errors.length > 0) {
    console.log(`\n${colors.bright}${colors.red}Errors:${colors.reset}`);
    const errorSummary = {};
    results.errors.forEach(e => {
      const key = `${e.endpoint}: ${e.error}`;
      errorSummary[key] = (errorSummary[key] || 0) + 1;
    });

    Object.entries(errorSummary).forEach(([error, count]) => {
      console.log(`  ${error} (${count} times)`);
    });
  }

  // Production Performance Assessment
  console.log(
    `\n${colors.bright}Production Performance Assessment:${colors.reset}`
  );

  // Different thresholds for production
  if (stats.p95 < 2000) {
    console.log(`  ${colors.green}✓ Excellent: P95 < 2 seconds${colors.reset}`);
  } else if (stats.p95 < 5000) {
    console.log(
      `  ${colors.yellow}⚠ Acceptable: P95 < 5 seconds${colors.reset}`
    );
  } else {
    console.log(`  ${colors.red}✗ Slow: P95 > 5 seconds${colors.reset}`);
  }

  if (results.failed / totalRequests < 0.01) {
    console.log(`  ${colors.green}✓ Error rate < 1%${colors.reset}`);
  } else if (results.failed / totalRequests < 0.05) {
    console.log(`  ${colors.yellow}⚠ Error rate < 5%${colors.reset}`);
  } else {
    console.log(
      `  ${colors.red}✗ High error rate (${((results.failed / totalRequests) * 100).toFixed(1)}%)${colors.reset}`
    );
  }

  // Comparison with local
  console.log(
    `\n${colors.bright}💡 Production vs Local Comparison:${colors.reset}`
  );
  console.log(`  Production Avg: ${stats.avg.toFixed(2)}ms`);
  console.log(`  Your Local Avg: 59.47ms`);
  console.log(`  Difference: ${(stats.avg - 59.47).toFixed(2)}ms slower`);

  console.log('\n' + '='.repeat(60));
}

/**
 * Main test runner with safety checks
 */
async function runProductionTest() {
  console.log(
    `${colors.yellow}${colors.bright}⚠️  PRODUCTION LOAD TEST${colors.reset}`
  );
  console.log(
    `${colors.yellow}Testing with care to avoid overloading production${colors.reset}\n`
  );

  console.log(`Testing: ${CONFIG.baseUrl}`);
  console.log(
    `Users: ${CONFIG.concurrentUsers} (max: ${CONFIG.maxConcurrentUsers})`
  );
  console.log(
    `Requests per user: ${CONFIG.requestsPerUser} (max: ${CONFIG.maxRequestsPerUser})`
  );
  console.log(
    `Safety delay: ${CONFIG.delayBetweenRequests}ms between requests\n`
  );

  // Confirmation prompt for safety
  console.log(
    `${colors.yellow}Press Ctrl+C now to cancel, or wait 3 seconds to continue...${colors.reset}`
  );
  await new Promise(resolve => setTimeout(resolve, 3000));

  results.startTime = Date.now();

  // Create promises for all users with staggered starts
  const userPromises = [];
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    // Stagger user starts more for production
    await new Promise(resolve => setTimeout(resolve, 200));
    userPromises.push(simulateUser(i));
  }

  // Wait for completion
  await Promise.all(userPromises);

  results.endTime = Date.now();

  // Print results
  printResults();

  // Save results
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `./load-testing/reports/production-${timestamp}.json`;

  if (!fs.existsSync('./load-testing/reports')) {
    fs.mkdirSync('./load-testing/reports', { recursive: true });
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        config: CONFIG,
        results,
        stats: calculateStats(),
        timestamp: new Date().toISOString(),
        environment: 'production',
      },
      null,
      2
    )
  );

  console.log(`\nDetailed report saved to: ${reportPath}`);

  // Final warning
  console.log(
    `\n${colors.yellow}Remember: This was a gentle test. Real traffic patterns may differ.${colors.reset}`
  );
  console.log(
    `${colors.yellow}Monitor your Vercel and Supabase dashboards for any issues.${colors.reset}`
  );
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nTest cancelled by user.\n');
  process.exit(0);
});

// Run the test
runProductionTest().catch(console.error);
