#!/usr/bin/env node

/**
 * Simple Free Load Testing Script for DTF Editor
 * No paid tools required - just uses Node.js built-in modules
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
  testDuration: parseInt(process.env.TEST_DURATION) || 30, // seconds
  requestsPerUser: parseInt(process.env.REQUESTS_PER_USER) || 10,
};

// Test results storage
const results = {
  successful: 0,
  failed: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test endpoints - add more as needed
const endpoints = [
  { path: '/', method: 'GET', name: 'Home Page' },
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/pricing', method: 'GET', name: 'Pricing Page' },
  { path: '/process', method: 'GET', name: 'Process Page' },
];

/**
 * Make HTTP request and measure response time
 */
function makeRequest(endpoint) {
  return new Promise(resolve => {
    const startTime = performance.now();
    const url = new URL(CONFIG.baseUrl + endpoint.path);
    const module = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: endpoint.method,
      headers: {
        'User-Agent': 'DTF-LoadTest/1.0',
      },
      timeout: 10000, // 10 second timeout
    };

    const req = module.request(options, res => {
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
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      results.failed++;
      results.errors.push({
        endpoint: endpoint.name,
        error: error.message,
        responseTime,
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
 * Simulate a single user making requests
 */
async function simulateUser(userId) {
  console.log(`${colors.cyan}User ${userId} started${colors.reset}`);

  for (let i = 0; i < CONFIG.requestsPerUser; i++) {
    // Pick a random endpoint
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    await makeRequest(endpoint);

    // Add random delay between requests (100-500ms)
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 400 + 100)
    );
  }

  console.log(`${colors.cyan}User ${userId} completed${colors.reset}`);
}

/**
 * Calculate statistics from results
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
 * Print test results
 */
function printResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const totalRequests = results.successful + results.failed;
  const stats = calculateStats();

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}LOAD TEST RESULTS${colors.reset}`);
  console.log('='.repeat(60));

  console.log(`\n${colors.bright}Test Configuration:${colors.reset}`);
  console.log(`  URL: ${CONFIG.baseUrl}`);
  console.log(`  Concurrent Users: ${CONFIG.concurrentUsers}`);
  console.log(`  Requests per User: ${CONFIG.requestsPerUser}`);
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

  // Show response time distribution by endpoint
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

  // Performance assessment
  console.log(`\n${colors.bright}Performance Assessment:${colors.reset}`);
  if (stats.p95 < 1000) {
    console.log(`  ${colors.green}✓ Excellent: P95 < 1 second${colors.reset}`);
  } else if (stats.p95 < 3000) {
    console.log(`  ${colors.yellow}⚠ Good: P95 < 3 seconds${colors.reset}`);
  } else {
    console.log(
      `  ${colors.red}✗ Needs Improvement: P95 > 3 seconds${colors.reset}`
    );
  }

  if (results.failed / totalRequests < 0.01) {
    console.log(`  ${colors.green}✓ Error rate < 1%${colors.reset}`);
  } else {
    console.log(
      `  ${colors.red}✗ High error rate (${((results.failed / totalRequests) * 100).toFixed(1)}%)${colors.reset}`
    );
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main test runner
 */
async function runLoadTest() {
  console.log(`${colors.bright}Starting Load Test...${colors.reset}`);
  console.log(`Testing: ${CONFIG.baseUrl}`);
  console.log(`Simulating ${CONFIG.concurrentUsers} concurrent users`);
  console.log(`Each user will make ${CONFIG.requestsPerUser} requests\n`);

  results.startTime = Date.now();

  // Create promises for all users
  const userPromises = [];
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    // Stagger user start times slightly
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    userPromises.push(simulateUser(i));
  }

  // Wait for all users to complete
  await Promise.all(userPromises);

  results.endTime = Date.now();

  // Print results
  printResults();

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fs = require('fs');
  const reportPath = `./load-testing/reports/report-${timestamp}.json`;

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
        stats: calculateStats(),
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
  results.endTime = Date.now();
  printResults();
  process.exit(0);
});

// Run the test
runLoadTest().catch(console.error);
