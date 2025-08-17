# Upstash Redis Setup for Production Rate Limiting

## Why Upstash Redis is Critical for Production

With 1000+ users, you'll likely need multiple server instances. The current in-memory rate limiter only works on a single server, meaning:
- Users could bypass limits by hitting different servers
- Rate limit counts reset when servers restart
- No shared state between server instances

## Quick Setup Guide

### 1. Create Upstash Account & Database
1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database
3. Choose a region close to your Vercel deployment
4. Select "Global" for multi-region if you expect international traffic

### 2. Get Your Credentials
From the Upstash console, copy:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 3. Add to Vercel Environment Variables
```bash
# In Vercel Dashboard > Settings > Environment Variables
UPSTASH_REDIS_REST_URL=your_url_here
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 4. That's It!
The rate limiting code already checks for these variables and will automatically use Redis when available.

## Current Rate Limits (Production-Ready)

Based on 1000+ concurrent users:

| Endpoint Type | Limit | Window | Rationale |
|--------------|-------|---------|-----------|
| **Auth** | 20 req | 5 min | Allows password retry without frustration |
| **Admin** | 200 req | 1 min | Admins need to work efficiently |
| **Payment** | 30 req | 1 min | Cart updates, price checks |
| **Upload** | 20 req | 1 min | Batch processing capability |
| **Processing** | 50 req | 1 min | Credits already limit usage |
| **General API** | 300 req | 1 min | Smooth app experience |
| **Public** | 500 req | 1 min | Landing pages, marketing |

## Monitoring Rate Limits

### Check Redis Usage
```javascript
// Add this endpoint to monitor rate limits
export async function GET() {
  const stats = await redis.dbsize();
  return NextResponse.json({ 
    keys: stats,
    estimatedUsers: Math.floor(stats / 10) // rough estimate
  });
}
```

### Adjust Limits Based on Usage
Monitor for:
- Users frequently hitting limits (increase limits)
- Abuse patterns (decrease limits for specific endpoints)
- Peak usage times (consider time-based limits)

## Cost Estimation

For 1000 active users:
- **Upstash Free Tier**: 10,000 commands/day (might be tight)
- **Upstash Pay-as-you-go**: ~$0.20 per 100K commands
- **Estimated Cost**: $10-30/month for 1000 active users

## Advanced Configuration

### Different Limits for Paid Users
```typescript
// In rate-limit.ts
const isPaidUser = request.headers.get('x-subscription-tier');
const multiplier = isPaidUser === 'pro' ? 2 : 1;
const adjustedLimit = config.requests * multiplier;
```

### Bypass for Specific IPs (Partners/Internal)
```typescript
const whitelist = ['YOUR_OFFICE_IP'];
const clientIP = getClientIdentifier(request);
if (whitelist.includes(clientIP)) {
  return null; // Skip rate limiting
}
```

## Testing Production Limits

```bash
# Test script to verify limits are working
for i in {1..10}; do
  curl -X GET https://dtfeditor.com/api/user/profile \
    -H "Authorization: Bearer YOUR_TOKEN" &
done
wait
```

## Emergency Controls

If you need to temporarily disable rate limiting:

1. Set environment variable: `DISABLE_RATE_LIMITING=true`
2. Update code to check:
```typescript
if (process.env.DISABLE_RATE_LIMITING === 'true') {
  return null; // Skip rate limiting
}
```

## Recommended Next Steps

1. **Set up Upstash Redis immediately** - Current in-memory solution won't scale
2. **Monitor actual usage patterns** for the first week
3. **Adjust limits based on real data**
4. **Consider implementing tier-based limits** (free vs paid users)
5. **Set up alerts** for when many users hit rate limits

---

**Note**: The current limits are conservative estimates. You may need to increase them based on actual usage patterns. It's better to start generous and tighten if needed rather than frustrate legitimate users.