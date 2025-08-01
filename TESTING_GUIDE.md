# DTF Editor - Testing Guide for Phase 4.1

**Date:** January 2025  
**Purpose:** Test credit system implementation before proceeding

---

## 🧪 **Testing Checklist**

### **1. Database Setup**

First, apply the migrations:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: In Supabase Dashboard
# Go to SQL Editor and run migrations 008 and 009 manually
```

### **2. Environment Variables**

Ensure these are set in `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=test-cron-secret-123
```

### **3. Run Automated Tests**

```bash
# Test credit reset logic
node scripts/test-credit-reset.js

# Test credit expiration system
node scripts/test-credit-expiration.js
```

### **4. Manual Testing Steps**

#### **A. Test Credit Reset (Free Tier)**

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Create a test user:**
   - Sign up with a test email
   - Note: User starts with 0 credits (free tier)

3. **Test manual credit reset:**
   ```bash
   # In another terminal, run:
   curl -X POST http://localhost:3000/api/cron/reset-credits \
     -H "Content-Type: application/json" \
     -d '{"userId": "YOUR_USER_ID", "secret": "test-cron-secret-123"}'
   ```

4. **Verify:**
   - Check dashboard - should show 2 credits
   - Check Supabase dashboard - credit_transactions table should have reset entry

#### **B. Test Credit History API**

1. **While logged in, visit:**
   ```
   http://localhost:3000/api/credits/history
   ```

2. **Expected response:**
   ```json
   {
     "success": true,
     "data": {
       "transactions": [...],
       "activePurchases": [...],
       "summary": {
         "total_credits": 2,
         "active_credits": 2,
         "rollover_credits": 0,
         "next_expiration_date": null,
         "active_purchases": 0
       }
     }
   }
   ```

#### **C. Test Credit Usage with Expiration**

1. **Use existing image processing:**
   - Go to /process
   - Upload an image
   - Use any tool (upscale, background removal, vectorize)

2. **Check credit deduction:**
   - Credits should decrease
   - Transaction should appear in history

3. **Verify in database:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 10;
   SELECT * FROM credit_purchases WHERE user_id = 'YOUR_USER_ID';
   ```

#### **D. Test Cron Endpoint**

1. **Test GET endpoint (for cron jobs):**
   ```bash
   curl -X GET http://localhost:3000/api/cron/reset-credits \
     -H "Authorization: Bearer test-cron-secret-123"
   ```

2. **Expected:** Should reset credits for all eligible users

---

## 📊 **What to Look For**

### **✅ Success Indicators:**

1. **Credit Reset Works:**
   - Free users get 2 credits monthly
   - Only resets after 30 days
   - Transactions are logged

2. **Credit History Works:**
   - API returns proper data structure
   - Transactions show up correctly
   - Summary calculations are accurate

3. **Credit Usage Works:**
   - Credits deduct when using tools
   - FIFO logic applies (oldest credits first)
   - Refunds work on failures

### **❌ Common Issues:**

1. **Migration Errors:**
   - Check if tables exist: `credit_transactions`, `credit_purchases`
   - Ensure functions were created
   - Verify RLS policies are in place

2. **Environment Issues:**
   - Missing `SUPABASE_SERVICE_ROLE_KEY`
   - Wrong `CRON_SECRET`

3. **Credit Not Deducting:**
   - Check if `use_credits_with_expiration` function exists
   - Verify ImageProcessingService is using new method

---

## 🔍 **Database Verification Queries**

Run these in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('credit_transactions', 'credit_purchases');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('reset_monthly_credits', 'use_credits_with_expiration', 'add_credit_purchase');

-- View recent transactions
SELECT * FROM credit_transactions 
ORDER BY created_at DESC 
LIMIT 20;

-- Check user credit summary
SELECT * FROM user_credit_summary;

-- Check credit purchases
SELECT * FROM credit_purchases
ORDER BY created_at DESC;
```

---

## 🐛 **Debugging Tips**

1. **Check browser console** for API errors
2. **Check terminal** running `npm run dev` for server errors
3. **Check Supabase logs** in dashboard for database errors
4. **Use browser DevTools Network tab** to inspect API calls

---

## 📱 **Quick Test Scenarios**

### **Scenario 1: New User Flow**
1. Sign up new user
2. Check credits (should be 0)
3. Run manual reset
4. Check credits (should be 2)
5. Use 1 credit on image processing
6. Check history shows usage

### **Scenario 2: Credit Expiration**
1. Run `test-credit-expiration.js`
2. Check that FIFO works (oldest credits used first)
3. Verify rollover logic in database

### **Scenario 3: API Integration**
1. Test `/api/credits/history` endpoint
2. Test `/api/cron/reset-credits` endpoint
3. Check error handling with invalid auth

---

## ✅ **Ready to Continue Checklist**

Before moving to Phase 4.1.3, verify:

- [ ] Credit reset works for free users
- [ ] Credit history API returns data
- [ ] Credit usage deducts properly
- [ ] Transactions are logged
- [ ] No console errors
- [ ] Database migrations applied successfully

If all checks pass, you're ready to continue!