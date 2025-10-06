# Quick Load Testing Guide (FREE - No Paid Tools!)

## What This Tests

Our free load testing setup helps you identify:

- How many users your app can handle simultaneously
- Which pages/features are slow
- Where bottlenecks occur
- Error rates under load

## Setup (30 seconds)

No installation needed! Just use the scripts in this folder.

## Running Tests

### 1. Quick Health Check (1 minute)

Test if your site can handle 10 concurrent users:

```bash
node load-testing/simple-load-test.js
```

### 2. Moderate Load Test (2 minutes)

Test with 25 users:

```bash
CONCURRENT_USERS=25 node load-testing/simple-load-test.js
```

### 3. Stress Test (3 minutes)

See when things start breaking:

```bash
CONCURRENT_USERS=50 REQUESTS_PER_USER=20 node load-testing/simple-load-test.js
```

### 4. User Flow Test

Test real user journeys (signup, image upload, etc):

```bash
TEST_USERS=10 node load-testing/user-flow-test.js
```

## Testing Different Environments

### Test Local Development

```bash
TEST_URL=http://localhost:3000 node load-testing/simple-load-test.js
```

### Test Production (BE CAREFUL!)

```bash
TEST_URL=https://dtfeditor.com CONCURRENT_USERS=5 node load-testing/simple-load-test.js
```

## Understanding Results

### Good Signs 🟢

- P95 response time < 3 seconds
- Error rate < 1%
- Consistent response times

### Warning Signs 🟡

- P95 response time 3-5 seconds
- Error rate 1-5%
- Response times increasing with load

### Bad Signs 🔴

- P95 response time > 5 seconds
- Error rate > 5%
- Timeouts or connection errors

## Example Output

```
=======================================================
LOAD TEST RESULTS
=======================================================

Test Configuration:
  URL: http://localhost:3000
  Concurrent Users: 10
  Duration: 15.34 seconds

Request Statistics:
  Total Requests: 100
  Successful: 98 (98.0%)
  Failed: 2 (2.0%)
  Requests/sec: 6.52

Response Times (ms):
  Min: 45.23
  Avg: 234.56
  P50: 198.34
  P95: 567.89
  P99: 1234.56
  Max: 2345.67

Performance Assessment:
  ✓ Excellent: P95 < 1 second
  ⚠ Warning: Error rate slightly high (2.0%)
```

## Common Issues & Solutions

### "Connection refused" errors

**Problem**: Server can't handle the load
**Solution**: Start with fewer users (5-10) and gradually increase

### Very slow response times

**Problem**: Database queries or API calls are slow
**Solution**:

1. Check database connection pooling
2. Add caching where possible
3. Optimize slow queries

### High error rates

**Problem**: Rate limiting or resource exhaustion
**Solution**:

1. Check rate limit settings
2. Monitor server memory/CPU during tests
3. Check database connection limits

## Free Monitoring During Tests

While running load tests, monitor:

1. **Terminal Window 1** - Run the load test
2. **Terminal Window 2** - Watch server logs:
   ```bash
   npm run dev
   # or for production logs
   vercel logs --follow
   ```
3. **Browser** - Open these dashboards:
   - Vercel Dashboard: Check function execution times
   - Supabase Dashboard: Monitor database connections
   - Your app's /api/health endpoint

## When to Run Load Tests

### Safe Times ✅

- Local development (anytime)
- Staging environment (anytime)
- Production (off-peak hours, with small loads)

### Never ❌

- During peak business hours
- With massive loads on production
- Without warning your team

## Progressive Testing Strategy

1. **Start Small**: 5 users, 10 requests each
2. **Gradual Increase**: 10, 25, 50, 100 users
3. **Find Breaking Point**: Keep increasing until errors appear
4. **Optimize**: Fix bottlenecks found
5. **Retest**: Verify improvements

## Saving Results

Results are automatically saved to `load-testing/reports/` with timestamps.

Compare results over time:

```bash
ls -la load-testing/reports/
```

## No Budget? No Problem!

This testing setup is 100% free and gives you:

- Real performance metrics
- Bottleneck identification
- Confidence in your app's capacity
- No external dependencies
- No credit card required

## Need More Advanced Testing?

If you later need more advanced features like:

- Distributed testing from multiple locations
- Advanced scripting and scenarios
- Real browser testing
- Detailed performance profiling

Consider these free/cheap options:

- K6 (free, open source)
- Locust (free, open source)
- Apache JMeter (free, open source)
- Loader.io (free tier available)

But honestly, our simple Node.js scripts will cover 90% of your needs!
