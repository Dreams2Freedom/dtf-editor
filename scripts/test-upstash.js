#!/usr/bin/env node

/**
 * Test Upstash Redis Connection
 * Run this after adding UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local
 */

const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

async function testUpstash() {
  console.log('🔧 Testing Upstash Redis Connection\n');
  console.log('='.repeat(50));

  // Check environment variables
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ Missing Upstash credentials!');
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to https://console.upstash.com');
    console.log(
      '2. Create a new Redis database (choose region close to your app)'
    );
    console.log('3. Copy the REST API credentials');
    console.log('4. Add to .env.local:');
    console.log('   UPSTASH_REDIS_REST_URL=your_url_here');
    console.log('   UPSTASH_REDIS_REST_TOKEN=your_token_here');
    console.log('5. Add the same variables to Vercel:');
    console.log('   vercel env add UPSTASH_REDIS_REST_URL');
    console.log('   vercel env add UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`📍 URL: ${url.substring(0, 30)}...`);
  console.log(
    `🔑 Token: ${token.substring(0, 10)}...${token.substring(token.length - 5)}\n`
  );

  try {
    // Create Redis client
    const redis = new Redis({
      url,
      token,
    });

    console.log('🔗 Connecting to Upstash Redis...');

    // Test basic operations
    console.log('\n📝 Testing basic operations:');

    // SET
    await redis.set('test:connection', 'success');
    console.log('✅ SET operation successful');

    // GET
    const value = await redis.get('test:connection');
    console.log(`✅ GET operation successful: "${value}"`);

    // Test rate limiting key format
    const testKey = 'dtf-editor:api:ip:127.0.0.1';
    await redis.setex(
      testKey,
      60,
      JSON.stringify({ count: 1, resetAt: Date.now() + 60000 })
    );
    console.log('✅ Rate limit key format test successful');

    // Get key TTL
    const ttl = await redis.ttl(testKey);
    console.log(`✅ TTL check successful: ${ttl} seconds remaining`);

    // Test increment (for rate limiting)
    await redis.incr('test:counter');
    const counter = await redis.get('test:counter');
    console.log(`✅ INCREMENT operation successful: counter = ${counter}`);

    // Database info
    const dbSize = await redis.dbsize();
    console.log(`\n📊 Database Statistics:`);
    console.log(`   Total keys: ${dbSize}`);

    // Cleanup test keys
    await redis.del('test:connection', 'test:counter', testKey);
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Upstash Redis is working perfectly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy to Vercel to use Redis in production');
    console.log('2. Monitor usage at https://console.upstash.com');
    console.log('3. Rate limiting will automatically use Redis when available');

    // Test rate limit simulation
    console.log('\n🔒 Simulating rate limit behavior:');
    const Ratelimit = require('@upstash/ratelimit').Ratelimit;

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 s'),
      analytics: true,
      prefix: 'test',
    });

    const identifier = 'test-user-123';
    console.log(`Testing with identifier: ${identifier}`);
    console.log('Limit: 5 requests per 10 seconds\n');

    for (let i = 1; i <= 7; i++) {
      const { success, limit, remaining, reset } =
        await ratelimit.limit(identifier);
      console.log(
        `Request ${i}: ${success ? '✅ Allowed' : '❌ Blocked'} (${remaining}/${limit} remaining)`
      );

      if (!success && i === 6) {
        console.log(
          `   Rate limit exceeded! Reset at: ${new Date(reset).toLocaleTimeString()}`
        );
      }
    }

    console.log(
      '\n✨ Rate limiting with Upstash Redis is ready for production!'
    );
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify credentials are correct');
    console.log('3. Ensure Redis database is active in Upstash console');
    console.log(
      '4. Check if your IP is whitelisted (if using IP restrictions)'
    );
    process.exit(1);
  }
}

testUpstash().catch(console.error);
