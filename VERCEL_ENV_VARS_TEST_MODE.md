# Vercel Environment Variables - TEST MODE

**For DTFEditor.com Test Deployment**  
**Created:** August 3, 2025

## 🎯 Quick Deployment Steps

### Option A: Use the Automated Script
```bash
./deploy-test-mode.sh
```

### Option B: Manual Setup in Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Create new project or select existing
3. Go to Settings → Environment Variables
4. Add each variable below for "Production" environment

## 📋 Environment Variables to Add

### 🔷 Supabase (Add to Production + Preview)
```
NEXT_PUBLIC_SUPABASE_URL=https://xysuxhdqukjtqgzetwps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5c3V4aGRxdWtqdHFnemV0d3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODczNDgsImV4cCI6MjA2ODE2MzM0OH0.6RyKRNtisph9JeBOhcllQZvFmSxLzsnG2kYl7D-wKnw
SUPABASE_SERVICE_ROLE_KEY=[Copy from .env.local]
```

### 🎨 AI Services (Production only)
```
DEEP_IMAGE_API_KEY=[Copy from .env.local]
CLIPPINGMAGIC_API_KEY=[Copy from .env.local]
CLIPPINGMAGIC_API_SECRET=[Copy from .env.local]
VECTORIZER_API_KEY=[Copy from .env.local]
VECTORIZER_API_SECRET=[Copy from .env.local]
OPENAI_API_KEY=[Copy from .env.local or leave empty]
```

### 💳 Stripe TEST Mode (Important: TEST keys!)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Rl8bgPHFzf1GpIrGtRWiO99fFOaVQZ1PDc4vlR90STU2EuRi6sZK2pHbhNphsv7zwJWhLITBExCdXGdQNti2FQX00jHL7NnCV
STRIPE_SECRET_KEY=[Copy TEST secret key from .env.local]
STRIPE_WEBHOOK_SECRET=temp_placeholder

# Price IDs (TEST mode)
STRIPE_BASIC_PLAN_PRICE_ID=price_1RleoYPHFzf1GpIrfy9RVk9m
STRIPE_STARTER_PLAN_PRICE_ID=price_1RlepVPHFzf1GpIrjRiKHtvb
STRIPE_PAYG_10_CREDITS_PRICE_ID=price_1RqCymPHFzf1GpIr6L0Ec4cH
STRIPE_PAYG_20_CREDITS_PRICE_ID=price_1RqCzZPHFzf1GpIrF2EBwBnm
STRIPE_PAYG_50_CREDITS_PRICE_ID=price_1RqD0QPHFzf1GpIrcAqSHy0u
```

### 📧 Mailgun (Production only)
```
MAILGUN_API_KEY=[Copy from .env.local]
MAILGUN_DOMAIN=mg.dtfeditor.com
MAILGUN_FROM_EMAIL=noreply@mg.dtfeditor.com
MAILGUN_FROM_NAME=DTF Editor
```

### 🌐 App Configuration
```
NEXT_PUBLIC_APP_URL=https://dtfeditor.com
CRON_SECRET=67sggMk7N7n1WeeUMd1C59qpRvmVRBM7thBUEWXalK0=
```

## 🔄 After Initial Deployment

### 1. Set Up Stripe TEST Webhook
1. Go to Stripe Dashboard (TEST mode)
2. Developers → Webhooks → Add endpoint
3. Endpoint URL: `https://dtfeditor.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the signing secret (starts with `whsec_test_`)
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel
7. Redeploy

### 2. Configure Custom Domain
1. In Vercel: Settings → Domains
2. Add `dtfeditor.com`
3. Add `www.dtfeditor.com` → redirect to apex
4. Update DNS:
   - A record → 76.76.21.21
   - OR CNAME → cname.vercel-dns.com

### 3. Verify Test Mode
- Visit the deployed site
- Look for yellow banner: "🧪 TEST MODE"
- Test a payment with card: 4242 4242 4242 4242

## ⚠️ Important Notes

1. **We're using TEST Stripe keys** - no real payments
2. **CRON_SECRET** - Keep this secure
3. **Webhook Secret** - Update after creating webhook
4. **Test thoroughly** before switching to live mode

## 🧪 Test Checklist

After deployment, test:
- [ ] User registration (2 free credits)
- [ ] Subscribe to Basic plan
- [ ] Subscribe to Starter plan
- [ ] Purchase 10 credits
- [ ] Cancel subscription
- [ ] Image processing (all 3 types)
- [ ] Email delivery

## 🚀 Ready to Deploy!

Use either the automated script or manual setup above.