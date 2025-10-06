# Quick Vercel Setup Guide

## 🚀 Steps to Deploy

### 1. Go to [vercel.com](https://vercel.com)

### 2. Import Project

- Click "Add New..." → "Project"
- Import: `Dreams2Freedom/dtf-editor`

### 3. Add Environment Variables

In the "Environment Variables" section, add these:

#### Required Variables (Copy exactly as shown):

```
NEXT_PUBLIC_APP_URL = https://dtfeditor.com
CRON_SECRET = ggtBAoBFnAj6dMr2lFe6rPgzJ90OKy1pALIDm0xHfxs=
NEXT_PUBLIC_SUPABASE_URL = https://xysuxhdqukjtqgzetwps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5c3V4aGRxdWtqdHFnemV0d3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODczNDgsImV4cCI6MjA2ODE2MzM0OH0.6RyKRNtisph9JeBOhcllQZvFmSxLzsnG2kYl7D-wKnw
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_51Rl8bgPHFzf1GpIrGtRWiO99fFOaVQZ1PDc4vlR90STU2EuRi6sZK2pHbhNphsv7zwJWhLITBExCdXGdQNti2FQX00jHL7NnCV
STRIPE_SECRET_KEY = [GET FROM YOUR .env.local - starts with sk_test_]
STRIPE_WEBHOOK_SECRET = whsec_test_placeholder
MAILGUN_DOMAIN = mg.dtfeditor.com
MAILGUN_FROM_EMAIL = noreply@mg.dtfeditor.com
MAILGUN_FROM_NAME = DTF Editor
```

#### Stripe Price IDs (Copy all):

```
STRIPE_BASIC_PLAN_PRICE_ID = price_1RleoYPHFzf1GpIrfy9RVk9m
STRIPE_STARTER_PLAN_PRICE_ID = price_1RlepVPHFzf1GpIrjRiKHtvb
STRIPE_PAYG_10_CREDITS_PRICE_ID = price_1RqCymPHFzf1GpIr6L0Ec4cH
STRIPE_PAYG_20_CREDITS_PRICE_ID = price_1RqCzZPHFzf1GpIrF2EBwBnm
STRIPE_PAYG_50_CREDITS_PRICE_ID = price_1RqD0QPHFzf1GpIrcAqSHy0u
```

#### Get from your .env.local file:

- SUPABASE_SERVICE_ROLE_KEY
- DEEP_IMAGE_API_KEY
- CLIPPINGMAGIC_API_KEY
- CLIPPINGMAGIC_API_SECRET
- VECTORIZER_API_KEY
- VECTORIZER_API_SECRET
- OPENAI_API_KEY
- MAILGUN_API_KEY

### 4. Deploy

Click "Deploy" and wait for build to complete

### 5. After Deployment

#### Add Custom Domain:

1. Go to Settings → Domains
2. Add `dtfeditor.com`
3. Follow DNS instructions

#### Set up Stripe Webhook:

1. Go to Stripe Dashboard (TEST mode)
2. Developers → Webhooks → Add endpoint
3. URL: `https://dtfeditor.com/api/webhooks/stripe`
4. Select events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
5. Copy signing secret
6. Update STRIPE_WEBHOOK_SECRET in Vercel
7. Redeploy

### 6. Verify

- Visit your site
- Look for yellow "TEST MODE" banner
- Test with card: 4242 4242 4242 4242

## 🎯 Important Notes

- We're using Stripe TEST keys (safe!)
- Your CRON_SECRET: `ggtBAoBFnAj6dMr2lFe6rPgzJ90OKy1pALIDm0xHfxs=`
- Get your Stripe TEST Secret from .env.local (starts with sk*test*)
