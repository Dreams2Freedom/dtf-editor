# DTF Editor - Production Deployment Checklist

**Last Updated:** August 7, 2025  
**Status:** Ready for Production

---

## 🚀 Pre-Production Checklist

### ✅ **Environment Variables**

#### **Essential (Required for Basic Functionality)**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

#### **Payment Processing (Required for Monetization)**
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (use live key for production)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe dashboard
- [ ] `STRIPE_BASIC_PLAN_PRICE_ID` - Price ID for Basic plan
- [ ] `STRIPE_STARTER_PLAN_PRICE_ID` - Price ID for Starter plan
- [ ] `STRIPE_PAYG_10_CREDITS_PRICE_ID` - Price ID for 10 credits
- [ ] `STRIPE_PAYG_20_CREDITS_PRICE_ID` - Price ID for 20 credits
- [ ] `STRIPE_PAYG_50_CREDITS_PRICE_ID` - Price ID for 50 credits

#### **AI Services (Required for Core Features)**
- [ ] `OPENAI_API_KEY` - For AI image generation (ChatGPT/DALL-E 3)
- [ ] `DEEP_IMAGE_API_KEY` - For image upscaling
- [ ] `CLIPPINGMAGIC_API_KEY` - For background removal
- [ ] `CLIPPINGMAGIC_API_SECRET` - ClippingMagic secret
- [ ] `VECTORIZER_API_KEY` - For vectorization
- [ ] `VECTORIZER_API_SECRET` - Vectorizer secret

#### **Email Service (Optional but Recommended)**
- [ ] `SENDGRID_API_KEY` - SendGrid API key
- [ ] `SENDGRID_FROM_EMAIL` - Sender email address
- [ ] `SENDGRID_FROM_NAME` - Sender name
- [ ] `SENDGRID_WELCOME_TEMPLATE_ID` - Welcome email template
- [ ] `SENDGRID_PURCHASE_TEMPLATE_ID` - Purchase confirmation template
- [ ] `SENDGRID_CREDIT_WARNING_TEMPLATE_ID` - Low credit warning template
- [ ] `SENDGRID_SUBSCRIPTION_TEMPLATE_ID` - Subscription notification template

#### **Other Settings**
- [ ] `APP_URL` - Your production domain (e.g., https://dtfeditor.com)
- [ ] `CRON_SECRET` - Secret for cron job authentication

---

## 🔧 **Stripe Configuration**

### **1. Create Products and Prices**
```
Products to create:
- Basic Plan ($9/month) - 20 credits/month
- Starter Plan ($19/month) - 60 credits/month
- 10 Credits Pack ($5 one-time)
- 20 Credits Pack ($9 one-time)
- 50 Credits Pack ($20 one-time)
```

### **2. Configure Webhooks**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### **3. Enable Customer Portal**
1. Go to Settings → Billing → Customer portal
2. Enable the portal
3. Configure allowed actions (cancel, update payment method, etc.)

---

## 📊 **Supabase Configuration**

### **1. Database Tables Required**
- [x] `profiles` - User profiles with credits
- [x] `credit_transactions` - Transaction history
- [x] `uploads` - Image upload records
- [x] `collections` - User collections
- [x] `notifications` - User notifications
- [x] `audit_logs` - Admin action logs

### **2. Row Level Security (RLS)**
- [ ] Verify all tables have RLS enabled
- [ ] Test policies for each table
- [ ] Ensure admin bypass policies are in place

### **3. Storage Buckets**
- [ ] Create `uploads` bucket for user images
- [ ] Set up public access policies
- [ ] Configure file size limits (50MB for Vercel Pro)

### **4. Edge Functions**
- [ ] Deploy credit reset function
- [ ] Deploy cleanup function for free user images

---

## 🎨 **OpenAI Configuration**

### **1. API Key Setup**
- [ ] Generate production API key from OpenAI dashboard
- [ ] Set usage limits to prevent overspending
- [ ] Monitor usage in OpenAI dashboard

### **2. Usage Monitoring**
- [ ] Set up alerts for high usage
- [ ] Review pricing for DALL-E 3:
  - Standard quality: ~$0.040 per image
  - HD quality: ~$0.080 per image

---

## 📧 **SendGrid Configuration (Optional)**

### **1. Account Setup**
- [ ] Verify sender domain
- [ ] Create API key with full access
- [ ] Set up IP whitelisting if needed

### **2. Email Templates**
- [ ] Create welcome email template
- [ ] Create purchase confirmation template
- [ ] Create credit warning template
- [ ] Create subscription notification template

---

## 🔐 **Security Checklist**

- [ ] All API keys are in environment variables (never in code)
- [ ] CORS configured properly
- [ ] Rate limiting implemented for API endpoints
- [ ] Input validation on all forms
- [ ] SQL injection protection (using Supabase client)
- [ ] XSS protection (React handles this)
- [ ] Admin routes protected with authentication
- [ ] Sensitive operations logged in audit trail

---

## 🧪 **Testing Checklist**

### **Core Features**
- [ ] User registration and login
- [ ] Password reset flow
- [ ] Image upload (test with large files)
- [ ] Image upscaling
- [ ] Background removal
- [ ] Vectorization
- [ ] AI image generation (new!)
- [ ] Credit deduction and refunds
- [ ] Gallery and storage management

### **Payment Features**
- [ ] Subscription purchase
- [ ] Credit pack purchase
- [ ] Subscription cancellation
- [ ] Plan switching
- [ ] Customer portal access
- [ ] Webhook processing

### **Admin Features**
- [ ] Admin login with 2FA
- [ ] User management
- [ ] Credit adjustments
- [ ] Notification sending
- [ ] Analytics dashboard
- [ ] Audit log viewing

---

## 📱 **Performance Optimization**

- [ ] Run production build: `npm run build`
- [ ] Test with Lighthouse
- [ ] Optimize images with `next/image`
- [ ] Enable caching headers
- [ ] Configure CDN (Vercel handles this)
- [ ] Monitor Core Web Vitals

---

## 🚢 **Deployment Steps**

### **1. Pre-Deployment**
```bash
# Run tests
npm test

# Type check
npm run type-check

# Build locally to check for errors
npm run build
```

### **2. Vercel Deployment**
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy to production
vercel --prod
```

### **3. Post-Deployment**
- [ ] Test all critical user flows
- [ ] Verify Stripe webhooks are receiving events
- [ ] Check error monitoring (Vercel dashboard)
- [ ] Monitor initial user activity
- [ ] Set up Google Analytics (optional)

---

## 📈 **Monitoring Setup**

- [ ] Vercel Analytics enabled
- [ ] Error tracking configured
- [ ] Uptime monitoring (e.g., UptimeRobot)
- [ ] Database performance monitoring (Supabase dashboard)
- [ ] Payment monitoring (Stripe dashboard)

---

## 🔄 **Cron Jobs**

### **Monthly Credit Reset**
- Endpoint: `/api/cron/reset-credits`
- Schedule: 1st of each month at 00:00 UTC
- Configure in Vercel or external cron service

### **Free User Image Cleanup**
- Endpoint: `/api/cron/cleanup-images`
- Schedule: Every 6 hours
- Deletes images older than 48 hours for free users

---

## 📝 **Final Notes**

### **Current Status**
- ✅ Phase 0-6 Complete (Core features, payments, storage, AI generation)
- ✅ Phase 7 Complete (Admin dashboard with logging)
- ⏳ Phase 8 Ready (Email system - just needs SendGrid config)

### **Known Limitations**
- DALL-E 3 can only generate 1 image at a time
- Free users have 48-hour image retention
- Max file size: 50MB (Vercel Pro limit)

### **Support Contacts**
- Stripe Support: dashboard.stripe.com/support
- Supabase Support: app.supabase.io/support
- Vercel Support: vercel.com/support
- OpenAI Support: platform.openai.com/support

---

**Ready for Production!** 🎉

Your DTF Editor is feature-complete and ready to launch. Follow this checklist to ensure a smooth deployment.