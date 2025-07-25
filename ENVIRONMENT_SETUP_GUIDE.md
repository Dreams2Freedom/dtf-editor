# DTF Editor - Environment Setup Guide

## 🚀 **Quick Start**

1. **Copy the example file:**

   ```bash
   cp env.example .env
   ```

2. **Follow this guide to get all your API keys and configuration values**

3. **Test your configuration before proceeding**

---

## 📋 **Required Services Setup**

### **1. Supabase Setup**

#### **Create Supabase Project**

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and keys

#### **Get Your Keys**

1. Go to **Settings** → **API**
2. Copy these values:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

#### **Database Connection**

1. Go to **Settings** → **Database**
2. Copy the connection string:
   ```
   SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:5432/postgres
   ```

---

### **2. OpenAI Setup**

#### **Get API Key**

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up/Login
3. Go to **API Keys**
4. Create a new secret key
5. Copy to: `OPENAI_API_KEY=sk-...`

#### **Organization ID (Optional)**

1. Go to **Settings** → **Organization**
2. Copy your organization ID: `OPENAI_ORGANIZATION=org-...`

---

### **3. Deep-Image.ai Setup**

#### **Get API Key**

1. Go to [https://deep-image.ai](https://deep-image.ai)
2. Sign up for an account
3. Go to **API** section
4. Generate your API key
5. Copy to: `DEEP_IMAGE_API_KEY=your_key_here`

---

### **4. ClippingMagic Setup**

#### **Get API Key**

1. Go to [https://clippingmagic.com](https://clippingmagic.com)
2. Sign up for an account
3. Go to **API** section
4. Get your API key
5. Copy to: `CLIPPINGMAGIC_API_KEY=your_key_here`

---

### **5. Vectorizer.ai Setup**

#### **Get API Key**

1. Go to [https://vectorizer.ai](https://vectorizer.ai)
2. Sign up for an account
3. Go to **API** section
4. Get your API key
5. Copy to: `VECTORIZER_API_KEY=your_key_here`

---

### **6. Stripe Setup**

#### **Create Stripe Account**

1. Go to [https://stripe.com](https://stripe.com)
2. Create a business account
3. Complete verification

#### **Get API Keys**

1. Go to **Developers** → **API Keys**
2. Copy these keys:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

#### **Create Products & Prices**

1. Go to **Products** → **Add Product**
2. Create these products:

   **Free Plan:**
   - Name: "Free Plan"
   - Price: $0/month
   - Price ID: Copy to `STRIPE_FREE_PLAN_PRICE_ID`

   **Basic Plan:**
   - Name: "Basic Plan"
   - Price: $9.99/month
   - Price ID: Copy to `STRIPE_BASIC_PLAN_PRICE_ID`

   **Starter Plan:**
   - Name: "Starter Plan"
   - Price: $24.99/month
   - Price ID: Copy to `STRIPE_STARTER_PLAN_PRICE_ID`

#### **Create Pay-as-You-Go Products**

1. Create one-time payment products:

   **10 Credits:**
   - Name: "10 Credits"
   - Price: $7.99
   - Price ID: Copy to `STRIPE_PAYG_10_CREDITS_PRICE_ID`

   **20 Credits:**
   - Name: "20 Credits"
   - Price: $14.99
   - Price ID: Copy to `STRIPE_PAYG_20_CREDITS_PRICE_ID`

   **50 Credits:**
   - Name: "50 Credits"
   - Price: $29.99
   - Price ID: Copy to `STRIPE_PAYG_50_CREDITS_PRICE_ID`

#### **Set Up Webhooks**

1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

### **7. SendGrid Setup**

#### **Create Account**

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your domain

#### **Get API Key**

1. Go to **Settings** → **API Keys**
2. Create a new API key with "Mail Send" permissions
3. Copy to: `SENDGRID_API_KEY=SG....`

#### **Create Email Templates**

1. Go to **Email API** → **Dynamic Templates**
2. Create these templates:

   **Welcome Email:**
   - Template ID: Copy to `SENDGRID_WELCOME_TEMPLATE_ID`

   **Credit Alert:**
   - Template ID: Copy to `SENDGRID_CREDIT_ALERT_TEMPLATE_ID`

   **Subscription Update:**
   - Template ID: Copy to `SENDGRID_SUBSCRIPTION_UPDATE_TEMPLATE_ID`

---

### **8. GoHighLevel Setup**

#### **Create Account**

1. Go to [https://gohighlevel.com](https://gohighlevel.com)
2. Sign up for an account
3. Complete setup

#### **Get API Credentials**

1. Go to **Settings** → **API**
2. Generate API key
3. Copy to: `GOHIGHLEVEL_API_KEY=your_key_here`
4. Copy Location ID to: `GOHIGHLEVEL_LOCATION_ID=your_location_id`

---

### **9. Railway Setup**

#### **Create Account**

1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

#### **Get Deployment Token**

1. Go to **Account** → **Tokens**
2. Create a new token
3. Copy to: `RAILWAY_TOKEN=your_token_here`
4. Note your service name: `RAILWAY_SERVICE_NAME=your_service_name`

---

## 🔐 **Security Configuration**

### **Generate Secure Secrets**

#### **JWT Secret**

```bash
# Generate a secure JWT secret (32+ characters)
openssl rand -base64 32
# Copy output to: JWT_SECRET=your_generated_secret
```

#### **Session Secret**

```bash
# Generate a secure session secret
openssl rand -base64 32
# Copy output to: SESSION_SECRET=your_generated_secret
```

#### **Cookie Secret**

```bash
# Generate a secure cookie secret
openssl rand -base64 32
# Copy output to: COOKIE_SECRET=your_generated_secret
```

---

## 🧪 **Testing Your Configuration**

### **Create Test Script**

Create a file called `test-env.js`:

```javascript
require('dotenv').config();

console.log('🔧 Testing Environment Configuration...\n');

// Test required variables
const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'DEEP_IMAGE_API_KEY',
  'CLIPPINGMAGIC_API_KEY',
  'VECTORIZER_API_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'SENDGRID_API_KEY',
];

let allGood = true;

required.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`❌ Missing: ${varName}`);
    allGood = false;
  } else {
    console.log(`✅ Found: ${varName}`);
  }
});

console.log(
  '\n' +
    (allGood
      ? '🎉 All required variables are set!'
      : '⚠️  Please fix missing variables.')
);
```

### **Run Test**

```bash
node test-env.js
```

---

## 🚀 **Production Deployment**

### **Environment-Specific Configurations**

#### **Development (.env)**

- Use test API keys
- Enable debug mode
- Use local URLs

#### **Staging (.env.staging)**

- Use test API keys
- Disable debug mode
- Use staging URLs

#### **Production (.env.production)**

- Use live API keys
- Disable debug mode
- Use production URLs
- Enable all security features

### **Railway Environment Variables**

1. Go to your Railway project
2. Go to **Variables** tab
3. Add all environment variables from your `.env` file
4. Set `NODE_ENV=production`

---

## 📋 **Checklist**

- [ ] Supabase project created and keys copied
- [ ] OpenAI API key obtained
- [ ] Deep-Image.ai API key obtained
- [ ] ClippingMagic API key obtained
- [ ] Vectorizer.ai API key obtained
- [ ] Stripe account created and products set up
- [ ] SendGrid account created and templates set up
- [ ] GoHighLevel account created and API key obtained
- [ ] Railway project created and token obtained
- [ ] Secure secrets generated (JWT, Session, Cookie)
- [ ] All environment variables copied to `.env`
- [ ] Configuration tested with test script
- [ ] Production environment variables ready

---

## ⚠️ **Important Security Notes**

1. **Never commit `.env` files to version control**
2. **Use different API keys for development and production**
3. **Rotate secrets regularly**
4. **Enable 2FA on all service accounts**
5. **Monitor API usage and costs**
6. **Use strong, unique passwords**
7. **Keep API keys secure and private**

---

## 🆘 **Troubleshooting**

### **Common Issues**

**"API key not found"**

- Check that the API key is correctly copied
- Ensure no extra spaces or characters
- Verify the service account is active

**"Database connection failed"**

- Check Supabase project is active
- Verify connection string format
- Ensure database is accessible

**"Stripe webhook failed"**

- Verify webhook endpoint is accessible
- Check webhook secret is correct
- Ensure events are properly configured

**"Email sending failed"**

- Verify SendGrid API key is correct
- Check domain verification status
- Ensure templates exist and are active

---

**Need Help?** Contact support or check the service documentation for each platform.
