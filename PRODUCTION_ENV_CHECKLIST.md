# Production Environment Variables Checklist

**Date Started:** August 2025  
**Deployment Target:** Vercel

## ✅ Required Environment Variables

Copy this template and fill in your production values:

### 🔷 Supabase Configuration

```env
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

- [ ] URL copied from Supabase dashboard
- [ ] Anon key copied
- [ ] Service role key copied (keep this secret!)

### 🎨 AI Services APIs

```env
# Deep-Image.ai (for upscaling)
DEEP_IMAGE_API_KEY=[YOUR-API-KEY]

# ClippingMagic (for background removal)
CLIPPINGMAGIC_API_KEY=[YOUR-API-KEY]
CLIPPINGMAGIC_API_SECRET=[YOUR-API-SECRET]

# Vectorizer.ai (for vectorization)
VECTORIZER_API_KEY=[YOUR-API-KEY]
VECTORIZER_API_SECRET=[YOUR-API-SECRET]

# OpenAI (optional - for future features)
OPENAI_API_KEY=[YOUR-API-KEY-IF-AVAILABLE]
```

- [ ] Deep-Image.ai key ready
- [ ] ClippingMagic credentials ready
- [ ] Vectorizer.ai credentials ready
- [ ] OpenAI key (optional)

### 💳 Stripe Configuration

```env
# Get from Stripe Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[YOUR-PUBLISHABLE-KEY]
STRIPE_SECRET_KEY=[YOUR-SECRET-KEY]
STRIPE_WEBHOOK_SECRET=[GENERATE-AFTER-WEBHOOK-SETUP]

# Price IDs (from your Stripe products)
STRIPE_BASIC_PLAN_PRICE_ID=[YOUR-BASIC-PRICE-ID]
STRIPE_STARTER_PLAN_PRICE_ID=[YOUR-STARTER-PRICE-ID]
STRIPE_PAYG_10_CREDITS_PRICE_ID=[YOUR-10-CREDITS-PRICE-ID]
STRIPE_PAYG_20_CREDITS_PRICE_ID=[YOUR-20-CREDITS-PRICE-ID]
STRIPE_PAYG_50_CREDITS_PRICE_ID=[YOUR-50-CREDITS-PRICE-ID]
```

- [ ] Publishable key copied
- [ ] Secret key copied
- [ ] All price IDs verified
- [ ] Webhook secret (will get after webhook setup)

### 📧 Mailgun Configuration

```env
# Get from Mailgun Dashboard
MAILGUN_API_KEY=[YOUR-API-KEY]
MAILGUN_DOMAIN=[YOUR-VERIFIED-DOMAIN] # e.g., mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@[YOUR-DOMAIN]
MAILGUN_FROM_NAME=DTF Editor
MAILGUN_WEBHOOK_SIGNING_KEY=[OPTIONAL-FOR-WEBHOOKS]
```

- [ ] API key copied
- [ ] Domain verified
- [ ] From email configured
- [ ] From name set

### 🌐 App Configuration

```env
# Your production URL
NEXT_PUBLIC_APP_URL=https://[YOUR-DOMAIN].com

# Generate a secure random string (min 32 characters)
CRON_SECRET=[GENERATE-SECURE-RANDOM-STRING]
```

- [ ] Production URL set
- [ ] CRON secret generated (use: openssl rand -base64 32)

## 📝 Notes Section

Use this space to track any issues or special configurations:

### Supabase Notes:

- Project URL:
- Region:
- Database password saved securely: [ ]

### Stripe Notes:

- Stripe account mode: [ ] Test [ ] Production
- Products created: [ ] Basic [ ] Starter [ ] Credit Packages
- Customer portal URL:

### Mailgun Notes:

- Domain verification status:
- SPF record added: [ ]
- DKIM record added: [ ]
- MX records configured: [ ]

### Deployment Notes:

- Vercel project name:
- Custom domain configured: [ ]
- SSL certificate active: [ ]

## 🔐 Security Reminders

- [ ] Never commit these values to Git
- [ ] Use Vercel's environment variable UI
- [ ] Different values for preview/production
- [ ] Rotate keys regularly
- [ ] Monitor for exposed secrets

## 🚀 Next Steps

Once all variables are collected:

1. Go to Vercel Dashboard > Project Settings > Environment Variables
2. Add each variable for Production environment
3. Some variables (NEXT*PUBLIC*\*) should also be added to Preview
4. Redeploy after adding all variables
