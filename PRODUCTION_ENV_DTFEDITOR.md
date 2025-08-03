# Production Environment Variables for DTFEditor.com

**Domain:** DTFEditor.com  
**Date:** August 3, 2025

## 🌐 Production Environment Variables

Copy these exact values when setting up in Vercel:

### App Configuration
```env
NEXT_PUBLIC_APP_URL=https://dtfeditor.com
CRON_SECRET=[GENERATE-NEW-SECRET-WITH: openssl rand -base64 32]
```

### Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=[Copy from your .env.local]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Copy from your .env.local]
SUPABASE_SERVICE_ROLE_KEY=[Copy from your .env.local]
```

### AI Services
```env
DEEP_IMAGE_API_KEY=[Copy from your .env.local]
CLIPPINGMAGIC_API_KEY=[Copy from your .env.local]
CLIPPINGMAGIC_API_SECRET=[Copy from your .env.local]
VECTORIZER_API_KEY=[Copy from your .env.local]
VECTORIZER_API_SECRET=[Copy from your .env.local]
OPENAI_API_KEY=[Copy from your .env.local if available]
```

### Stripe Configuration
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Copy STRIPE_PUBLISHABLE_KEY from .env.local]
STRIPE_SECRET_KEY=[Copy from your .env.local]
STRIPE_WEBHOOK_SECRET=[Will be generated after webhook setup]

# Price IDs (already verified)
STRIPE_BASIC_PLAN_PRICE_ID=price_1RleoYPHFzf1GpIrfy9RVk9m
STRIPE_STARTER_PLAN_PRICE_ID=price_1RlepVPHFzf1GpIrjRiKHtvb
STRIPE_PAYG_10_CREDITS_PRICE_ID=price_1RqCymPHFzf1GpIr6L0Ec4cH
STRIPE_PAYG_20_CREDITS_PRICE_ID=price_1RqCzZPHFzf1GpIrF2EBwBnm
STRIPE_PAYG_50_CREDITS_PRICE_ID=price_1RqD0QPHFzf1GpIrcAqSHy0u
```

### Mailgun Configuration
```env
MAILGUN_API_KEY=[Copy from your .env.local]
MAILGUN_DOMAIN=mg.dtfeditor.com  # Or your verified Mailgun domain
MAILGUN_FROM_EMAIL=noreply@mg.dtfeditor.com
MAILGUN_FROM_NAME=DTF Editor
MAILGUN_WEBHOOK_SIGNING_KEY=[Optional - for email tracking]
```

## 📧 Email Configuration Updates

### Update these email addresses throughout the app:
- **Support Email:** support@dtfeditor.com
- **No-Reply Email:** noreply@dtfeditor.com (or noreply@mg.dtfeditor.com for Mailgun)
- **Admin Email:** admin@dtfeditor.com

## 🔗 Webhook URLs

After deployment, configure these webhooks:

### Stripe Webhook
```
https://dtfeditor.com/api/webhooks/stripe
```

### Supabase Edge Function (for auth emails)
```
https://[your-project-ref].supabase.co/functions/v1/auth-email-handler
```

### Mailgun Webhook (optional)
```
https://dtfeditor.com/api/webhooks/mailgun
```

## 🌐 DNS Configuration for DTFEditor.com

### For Vercel (A Records or CNAME)
- **A Record:** Point to Vercel's IP addresses
  - 76.76.21.21
- **OR CNAME:** Point to cname.vercel-dns.com

### For Mailgun (if using mg.dtfeditor.com)
- **TXT Record (SPF):** `v=spf1 include:mailgun.org ~all`
- **TXT Record (DKIM):** Will be provided by Mailgun
- **MX Records:** (if receiving email)
  - mxa.mailgun.org (Priority: 10)
  - mxb.mailgun.org (Priority: 10)

## 🚀 Deployment Checklist for DTFEditor.com

### Pre-Deployment
- [ ] Generate new CRON_SECRET
- [ ] Update all environment variables in Vercel
- [ ] Verify Stripe is in production mode
- [ ] Verify Mailgun domain (mg.dtfeditor.com)

### Vercel Setup
- [ ] Add custom domain: dtfeditor.com
- [ ] Add www redirect: www.dtfeditor.com → dtfeditor.com
- [ ] Verify SSL certificate is active

### Post-Deployment
- [ ] Configure Stripe webhook with production URL
- [ ] Update STRIPE_WEBHOOK_SECRET in Vercel
- [ ] Deploy Supabase Edge Functions
- [ ] Test email delivery
- [ ] Test payment processing
- [ ] Monitor error logs

## 📝 Legal Pages to Update

Make sure these pages reflect DTFEditor.com:
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/contact` - Contact information

## 🔐 Security Checklist

- [ ] Remove all test API keys
- [ ] Ensure CORS is configured for dtfeditor.com only
- [ ] Enable rate limiting on API routes
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy

## 📊 Post-Launch Monitoring

Set up monitoring for:
- **Uptime:** Use Vercel Analytics or UptimeRobot
- **Errors:** Monitor Vercel Functions logs
- **Email Delivery:** Check Mailgun dashboard
- **Payments:** Monitor Stripe dashboard
- **Performance:** Use Vercel Web Vitals

---

**Ready to Deploy!** 🚀

Follow the steps in DEPLOYMENT_STEPS.md using these DTFEditor.com specific values.