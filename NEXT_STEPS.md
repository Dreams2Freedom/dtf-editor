# DTF Editor - Next Steps Quick Reference

**Current Date:** January 2025  
**Current Status:** Core features complete, starting business features

---

## 🎯 **IMMEDIATE NEXT TASK: Credit System Foundation (Phase 4.1)**

### **Today's Focus: Credit Reset Logic (4.1.1)**

1. **Create credit_transactions table** (30 min)

   ```sql
   CREATE TABLE credit_transactions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES profiles(id),
     amount INTEGER NOT NULL,
     type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund', 'reset'
     description TEXT,
     balance_after INTEGER,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Add last_credit_reset to profiles** (15 min)

   ```sql
   ALTER TABLE profiles
   ADD COLUMN last_credit_reset TIMESTAMP DEFAULT NOW();
   ```

3. **Create credit reset function** (45 min)
   - Check if user is free tier
   - Check if 30 days passed since last reset
   - Add 2 credits
   - Update last_credit_reset
   - Log transaction

4. **Create cron endpoint** (30 min)
   - `/api/cron/reset-credits`
   - Protected with secret key
   - Runs daily, checks all users

5. **Test the reset** (30 min)
   - Create test user
   - Manipulate last_reset date
   - Run reset function
   - Verify credits added

---

## 📋 **This Week's Overview**

### **Monday-Tuesday: Payment Foundation**

- ✓ Credit reset logic
- Credit purchase history
- Credit expiration tracking
- Enhanced credit display

### **Wednesday-Thursday: Stripe Subscriptions**

- Create Stripe products
- Build subscription flow
- Handle webhooks
- Update dashboard

### **Friday: Pay-as-You-Go**

- Credit packages setup
- Purchase interface
- Payment processing
- Success handling

---

## 🚦 **Before Starting Each Task**

1. **Check Context7 MCP for latest docs** - ALWAYS for Stripe/Supabase features!
2. **Read the task details** in DEVELOPMENT_ROADMAP_V3.md
3. **Check for dependencies** - what needs to exist first?
4. **Test current functionality** - make sure nothing is broken
5. **Create feature branch** - keep main branch stable
6. **Update tracking docs** after completion

### **Context7 Quick Searches for Today's Tasks:**

```
// For credit reset logic:
"Supabase scheduled functions"
"Supabase cron jobs Next.js"
"PostgreSQL timestamp operations"

// For Stripe (coming up):
"Stripe create subscription Next.js 2025"
"Stripe webhook handling Node.js"
"Stripe test mode best practices"
```

---

## 📝 **Quick Commands**

```bash
# Start dev server
npm run dev

# Run database migrations
npm run db:migrate

# Check TypeScript
npm run type-check

# Run tests
npm test

# Check Stripe webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## ⚠️ **Critical Reminders**

1. **Always test payments in Stripe TEST mode**
2. **Don't break existing credit deduction logic**
3. **Keep free users at 2 credits/month**
4. **Log all credit transactions**
5. **Update COMPLETION_TRACKER.md as you go**

---

## 🎪 **Current Context**

- **Completed:** All image processing features work
- **Completed:** Credit deduction works for all tools
- **Completed:** Background removal now deducts credits
- **Working on:** Making credits reset monthly
- **Next up:** Actual payment processing

---

**Remember:** Small, tested changes. One feature at a time. Update docs as you go.
