# Debug Vectorization Issue

## Current Status

- User has 9 credits in database (confirmed)
- Vectorization requires 2 credits
- Still getting "Insufficient credits" error

## Debug Steps

1. **Check Server Logs**
   - Look for "Credit check:" log in terminal when you try to vectorize
   - This will show what the server is seeing

2. **Restart Dev Server**

   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

3. **Try Vectorization Again**
   - The console should now show detailed credit check logs
   - Look for output like:
   ```
   Credit check: {
     userId: '...',
     requiredCredits: 2,
     availableCredits: ?,
     data: { ... },
     hasEnough: true/false
   }
   ```

## Alternative Quick Fix

If the issue persists, try this manual approach:

1. Clear your browser cache/cookies for localhost:3000
2. Log out and log back in
3. Try vectorization again

## What We've Fixed So Far

- ✅ Credit column mismatch (credits vs credits_remaining)
- ✅ Phantom credit refunds
- ✅ Credit display in UI
- ❓ Server-side credit check still failing

The issue appears to be that the server-side Supabase client might be getting stale data or there's a caching issue.
