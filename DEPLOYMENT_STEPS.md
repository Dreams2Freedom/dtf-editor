# DTF Editor - Production Deployment Steps

**Started:** August 3, 2025  
**Target:** Vercel Production

## 🎯 Current Status
- ✅ Code is pushed to GitHub
- ✅ Email system (Mailgun) integrated
- ✅ All features tested locally
- 🔄 Ready for production configuration

## 📋 Step-by-Step Deployment Guide

### Step 1: Prepare Environment Variables ⏳

First, let's fix the missing NEXT_PUBLIC variables in your env config:

1. **Update your env.ts file** to use the correct variable names:
   ```typescript
   // In src/config/env.ts, update:
   STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
   APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
   ```

2. **Generate a new CRON_SECRET** for production:
   ```bash
   openssl rand -base64 32
   ```
   Save this value - you'll need it for Vercel.

### Step 2: Configure Vercel Project ⏳

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project** (in the project directory):
   ```bash
   vercel link
   ```
   - Choose your team/account
   - Link to existing project or create new
   - Confirm the settings

### Step 3: Set Environment Variables in Vercel ⏳

**Option A: Using Vercel Dashboard (Recommended)**

1. Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables
2. Add each variable for "Production" environment:

   **Supabase Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your anon key  
   - `SUPABASE_SERVICE_ROLE_KEY` → Your service role key (keep secret!)

   **AI Service Variables:**
   - `DEEP_IMAGE_API_KEY` → Your Deep-Image.ai key
   - `CLIPPINGMAGIC_API_KEY` → Your ClippingMagic key
   - `CLIPPINGMAGIC_API_SECRET` → Your ClippingMagic secret
   - `VECTORIZER_API_KEY` → Your Vectorizer.ai key
   - `VECTORIZER_API_SECRET` → Your Vectorizer.ai secret
   - `OPENAI_API_KEY` → Your OpenAI key (if available)

   **Stripe Variables:**
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Copy from STRIPE_PUBLISHABLE_KEY in .env.local
   - `STRIPE_SECRET_KEY` → Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` → Leave empty for now (we'll set after webhook creation)
   - `STRIPE_BASIC_PLAN_PRICE_ID` → price_1RleoYPHFzf1GpIrfy9RVk9m
   - `STRIPE_STARTER_PLAN_PRICE_ID` → price_1RlepVPHFzf1GpIrjRiKHtvb
   - `STRIPE_PAYG_10_CREDITS_PRICE_ID` → price_1RqCymPHFzf1GpIr6L0Ec4cH
   - `STRIPE_PAYG_20_CREDITS_PRICE_ID` → price_1RqCzZPHFzf1GpIrF2EBwBnm
   - `STRIPE_PAYG_50_CREDITS_PRICE_ID` → price_1RqD0QPHFzf1GpIrcAqSHy0u

   **Mailgun Variables:**
   - `MAILGUN_API_KEY` → Your Mailgun API key
   - `MAILGUN_DOMAIN` → Your Mailgun domain
   - `MAILGUN_FROM_EMAIL` → Your from email
   - `MAILGUN_FROM_NAME` → DTF Editor

   **App Configuration:**
   - `NEXT_PUBLIC_APP_URL` → https://yourdomain.com (or use Vercel URL for now)
   - `CRON_SECRET` → The value you generated in Step 1

**Option B: Using Vercel CLI**
```bash
# For each variable, run:
vercel env add VARIABLE_NAME production

# For NEXT_PUBLIC vars, also add to preview:
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview
```

### Step 4: Deploy to Production ⏳

1. **Deploy the application**:
   ```bash
   vercel --prod
   ```

2. **Note your production URL** (e.g., dtf-editor.vercel.app)

3. **Update NEXT_PUBLIC_APP_URL** in Vercel to match your production URL

### Step 5: Configure Stripe Webhooks ⏳

1. **Go to Stripe Dashboard** → Developers → Webhooks

2. **Add endpoint**:
   - URL: `https://your-domain.vercel.app/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Copy the Signing Secret** and update `STRIPE_WEBHOOK_SECRET` in Vercel

4. **Redeploy** to apply the webhook secret:
   ```bash
   vercel --prod
   ```

### Step 6: Configure Supabase for Production ⏳

1. **Deploy Edge Functions**:
   ```bash
   cd supabase/functions/auth-email-handler
   supabase functions deploy auth-email-handler --project-ref [YOUR-PROJECT-REF]
   ```

2. **Set Edge Function Secrets**:
   ```bash
   supabase secrets set MAILGUN_API_KEY=[YOUR-KEY] --project-ref [YOUR-PROJECT-REF]
   supabase secrets set MAILGUN_DOMAIN=[YOUR-DOMAIN] --project-ref [YOUR-PROJECT-REF]
   supabase secrets set MAILGUN_FROM_EMAIL=[YOUR-EMAIL] --project-ref [YOUR-PROJECT-REF]
   supabase secrets set MAILGUN_FROM_NAME="DTF Editor" --project-ref [YOUR-PROJECT-REF]
   supabase secrets set APP_URL=[YOUR-PRODUCTION-URL] --project-ref [YOUR-PROJECT-REF]
   ```

3. **Configure Auth Email Hook** (in Supabase Dashboard):
   - Go to Database → Webhooks
   - Create new webhook for auth.users table
   - URL: Your Edge Function URL
   - Events: INSERT, UPDATE

### Step 7: Set Up Cron Jobs ⏳

1. **Configure Monthly Credit Reset**:
   - In Vercel, set up a cron job for `/api/cron/reset-credits`
   - Schedule: `0 0 1 * *` (1st of each month at midnight)
   - Add CRON_SECRET to the request

2. **Configure Expired Image Cleanup**:
   - Set up cron for `/api/cron/cleanup-images`
   - Schedule: `0 3 * * *` (Daily at 3 AM)

### Step 8: Configure Mailgun Domain ⏳

1. **Verify your domain** in Mailgun dashboard
2. **Add DNS records** as instructed by Mailgun:
   - SPF record
   - DKIM records
   - MX records (if using Mailgun for receiving)
3. **Test email delivery** from Mailgun dashboard

### Step 9: Final Checks ⏳

1. **Test critical flows**:
   - [ ] User registration (should receive welcome email)
   - [ ] Password reset (should receive reset email)
   - [ ] Image upload and processing
   - [ ] Credit purchase
   - [ ] Subscription purchase

2. **Monitor for errors** in Vercel Functions logs

3. **Check email delivery** in Mailgun dashboard

### Step 10: Custom Domain (Optional) ⏳

1. **Add custom domain** in Vercel project settings
2. **Update DNS** records as instructed
3. **Update all environment variables** with new domain
4. **Redeploy** application

## 🚨 Troubleshooting

### If emails aren't sending:
- Check Mailgun API key and domain
- Verify DNS records are propagated
- Check Vercel function logs for errors

### If payments aren't working:
- Verify Stripe is in production mode
- Check webhook signature is correct
- Monitor webhook attempts in Stripe dashboard

### If images aren't processing:
- Verify AI service API keys are correct
- Check API rate limits aren't exceeded
- Monitor Vercel function logs

## ✅ Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Application deployed successfully
- [ ] Stripe webhooks configured
- [ ] Supabase Edge Functions deployed
- [ ] Mailgun domain verified
- [ ] Cron jobs configured
- [ ] All critical flows tested
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring enabled

## 📞 Post-Deployment

1. **Monitor Vercel dashboard** for errors
2. **Check Stripe dashboard** for payment issues
3. **Monitor Mailgun** for email delivery rates
4. **Set up alerts** for critical errors

---

**Need Help?** 
- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- Mailgun Docs: https://documentation.mailgun.com