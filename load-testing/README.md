# Load Testing Guide for DTF Editor

## Overview

This directory contains load testing scripts and configurations for testing the DTF Editor application under various load conditions.

## Tools Used

- **Playwright** - For browser-based end-to-end load testing
- **Node.js scripts** - For API endpoint load testing
- **Artillery** (optional) - For advanced load testing scenarios

## Test Scenarios

### 1. Critical User Flows

- User registration and login
- Image upload and processing
- Payment processing
- Subscription management

### 2. API Endpoints

- `/api/auth/signup` - User registration
- `/api/auth/login` - User authentication
- `/api/upload` - Image upload
- `/api/upscale` - Image upscaling
- `/api/background-removal` - Background removal
- `/api/webhooks/stripe` - Payment webhooks

### 3. Performance Metrics

- Response time (p50, p95, p99)
- Throughput (requests per second)
- Error rate
- Resource utilization

## Installation

```bash
# Install load testing dependencies
npm install --save-dev @playwright/test artillery @faker-js/faker

# Install Artillery globally (optional)
npm install -g artillery
```

## Running Tests

### Quick Load Test (10 concurrent users)

```bash
npm run load:test:quick
```

### Standard Load Test (50 concurrent users)

```bash
npm run load:test:standard
```

### Stress Test (100+ concurrent users)

```bash
npm run load:test:stress
```

### API Load Test

```bash
node load-testing/api-load-test.js
```

### Browser-based Load Test

```bash
npx playwright test load-testing/browser-load-test.spec.ts --workers=10
```

## Test Configuration

Edit `load-testing/config.js` to configure:

- Base URL
- Number of virtual users
- Test duration
- Ramp-up period
- Test data (sample images, user credentials)

## Monitoring During Tests

1. **Application Metrics**
   - Monitor Vercel Analytics
   - Check Supabase Dashboard
   - Watch Stripe Dashboard

2. **Server Metrics**
   - Response times
   - Error rates
   - Database connections
   - Memory usage

## Interpreting Results

### Good Performance Indicators

- p95 response time < 3 seconds
- Error rate < 1%
- Successful transaction rate > 99%

### Warning Signs

- Response times increasing linearly with load
- Database connection pool exhaustion
- Memory leaks (increasing memory usage over time)
- High error rates on specific endpoints

## Best Practices

1. **Test in Staging Environment**
   - Never run load tests against production without permission
   - Use a separate Stripe test account
   - Use test credit cards

2. **Gradual Load Increase**
   - Start with small loads
   - Gradually increase concurrent users
   - Monitor system behavior at each level

3. **Clean Up Test Data**
   - Remove test users after testing
   - Clean up test uploads
   - Reset test database if needed

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - Solution: Adjust rate limits in test environment
   - Or: Add delays between requests

2. **Database Connection Limits**
   - Solution: Increase connection pool size
   - Or: Optimize database queries

3. **Memory Issues**
   - Solution: Implement proper cleanup in code
   - Monitor: Memory usage during tests

## Reports

Test results are saved in `load-testing/reports/` directory with timestamps.
