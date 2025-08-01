# DTF Editor - Manual Testing Steps for Credit System

**Server is running on: http://localhost:3000**

## 📋 Pre-Testing Setup

### 1. Apply Database Migrations

Since the migrations haven't been applied yet, you need to do this first:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Apply Migration 008**
   - Open `/supabase/migrations/008_create_credit_transactions.sql`
   - Copy the entire contents
   - Paste into SQL Editor and click **Run**

3. **Apply Migration 009**
   - Open `/supabase/migrations/009_credit_expiration_tracking.sql`
   - Copy the entire contents
   - Paste into SQL Editor and click **Run**

4. **Verify Tables Created**
   Run this query to verify:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('credit_transactions', 'credit_purchases');
   ```

## 🧪 Testing Steps

### Test 1: Visual Test Page

1. **Login to the app**
   - Go to http://localhost:3000
   - Login with your test account

2. **Navigate to Test Page**
   - Go to http://localhost:3000/test-credits
   - You should see:
     - User information card
     - Test actions card
     - Credit summary card

3. **Test Credit Reset**
   - Click "Reset Credits (Free Tier)"
   - Should add 2 credits to your account
   - Page will reload showing new balance

4. **Test Credit Usage**
   - Click "Test Credit Usage (1 credit)"
   - Should deduct 1 credit
   - Transaction should appear in history

### Test 2: API Endpoints

1. **Test Credit History API**
   - While logged in, open new tab
   - Go to http://localhost:3000/api/credits/history
   - Should see JSON response with:
     - transactions array
     - activePurchases array
     - summary object

2. **Test Cron Endpoint**
   ```bash
   curl -X GET http://localhost:3000/api/cron/reset-credits \
     -H "Authorization: Bearer test-cron-secret-123"
   ```

### Test 3: Process Page Integration

1. **Go to Process Page**
   - http://localhost:3000/process
   - Upload an image
   - Use any tool (upscale, background removal, vectorize)

2. **Verify Credit Deduction**
   - Credits should decrease by 1-2 depending on operation
   - Return to test page to see transaction in history

### Test 4: Command Line Tests

After migrations are applied, run:

```bash
# Test credit reset logic
node scripts/test-credit-reset.js

# Test credit expiration system
node scripts/test-credit-expiration.js
```

## ✅ Success Criteria

- [ ] Migrations applied successfully
- [ ] Test page loads without errors
- [ ] Credit reset adds 2 credits for free users
- [ ] Credit usage deducts properly
- [ ] Transactions appear in history
- [ ] API endpoints return proper data
- [ ] Process page deducts credits
- [ ] Command line tests pass

## 🚨 Common Issues

1. **"Column 'last_credit_reset' not found"**
   - Migrations not applied yet
   - Apply migrations through Supabase dashboard

2. **"Insufficient credits" error**
   - Run credit reset first
   - Check user has credits in database

3. **API returns 401 Unauthorized**
   - Make sure you're logged in
   - Check CRON_SECRET matches

## 📊 What to Check in Supabase Dashboard

After testing, verify in Supabase:

1. **credit_transactions table**
   - Should have entries for resets and usage
   - Check `type`, `amount`, `balance_after` columns

2. **credit_purchases table**
   - Should have entries after purchases (Phase 4.3)
   - Check expiration dates and remaining credits

3. **profiles table**
   - Check `credits_remaining` updates correctly
   - Check `last_credit_reset` timestamp

## 🎯 Next Steps

Once all tests pass:
1. Continue with Phase 4.1.3 (Credit Display Enhancement)
2. Then Phase 4.2 (Stripe Subscriptions)
3. Then Phase 4.3 (Pay-as-You-Go Credits)