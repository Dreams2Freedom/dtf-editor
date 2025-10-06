# 🚀 Upstash Redis Quick Setup (5 minutes)

## Step 1: Create Upstash Account

1. Go to https://console.upstash.com
2. Sign up with Google/GitHub or email
3. Verify your email if needed

## Step 2: Create Redis Database

1. Click "Create Database"
2. **Name:** `dtf-editor-production`
3. **Type:** Regional (or Global if you need multi-region)
4. **Region:** Choose closest to your Vercel deployment
   - For US: `us-east-1` or `us-west-1`
   - For EU: `eu-west-1`
5. **Eviction:** Enable (recommended for rate limiting)
6. Click "Create"

## Step 3: Get Your Credentials

1. In your database dashboard, go to "REST API" tab
2. You'll see:
   ```
   UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxx
   ```
3. Copy both values

## Step 4: Add to Local Development

1. Create/update `.env.local`:

   ```bash
   UPSTASH_REDIS_REST_URL=your_url_here
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```

2. Test locally:

   ```bash
   node scripts/test-upstash.js
   ```

   You should see:

   ```
   ✅ Environment variables found
   🔗 Connecting to Upstash Redis...
   ✅ SET operation successful
   ✅ GET operation successful
   🎉 Upstash Redis is working perfectly!
   ```

## Step 5: Add to Vercel

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add both variables:
   - Name: `UPSTASH_REDIS_REST_URL`
   - Value: (paste your URL)
   - Environment: ✅ Production, ✅ Preview, ✅ Development
4. Add second variable:
   - Name: `UPSTASH_REDIS_REST_TOKEN`
   - Value: (paste your token)
   - Environment: ✅ Production, ✅ Preview, ✅ Development

5. Click "Save"

## Step 6: Redeploy

```bash
git push origin main
```

Or trigger a redeploy from Vercel dashboard

## Step 7: Verify It's Working

1. Check your production logs for:

   ```
   ✅ Using Upstash Redis for rate limiting
   ```

2. Monitor usage at:
   - https://dtfeditor.com/api/admin/rate-limits/stats (requires admin login)
   - https://console.upstash.com (see request counts)

## 🎉 Done!

Your rate limiting is now using Redis and will work properly across multiple servers!

## Monitoring & Costs

- **Free tier:** 10,000 commands/day
- **Your usage:** ~100-300 commands per active user per day
- **Estimated:** Free tier covers ~30-100 active users
- **Scaling:** Pay-as-you-go starts at $0.20 per 100K commands

## Troubleshooting

If the test script fails:

1. Check credentials are copied correctly (no extra spaces)
2. Ensure database is "Active" in Upstash console
3. Try creating a new database if issues persist
4. Check if your IP needs whitelisting (usually not required)

## Next Steps

After setup:

1. Monitor rate limit stats daily for first week
2. Adjust limits based on actual usage
3. Set up alerts in Upstash console for high usage
4. Consider implementing tier-based limits for paid users
