#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Define which variables are needed for production
const REQUIRED_VARS = [
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // AI Services
  'DEEP_IMAGE_API_KEY',
  'CLIPPINGMAGIC_API_KEY',
  'CLIPPINGMAGIC_API_SECRET',
  'VECTORIZER_API_KEY',
  'VECTORIZER_API_SECRET',
  'OPENAI_API_KEY',
  
  // Stripe
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_BASIC_PLAN_PRICE_ID',
  'STRIPE_STARTER_PLAN_PRICE_ID',
  'STRIPE_PAYG_10_CREDITS_PRICE_ID',
  'STRIPE_PAYG_20_CREDITS_PRICE_ID',
  'STRIPE_PAYG_50_CREDITS_PRICE_ID',
  
  // Mailgun
  'MAILGUN_API_KEY',
  'MAILGUN_DOMAIN',
  'MAILGUN_FROM_EMAIL',
  'MAILGUN_FROM_NAME',
  
  // App Config
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET'
];

// Parse env file
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

// Create Vercel CLI commands
console.log('# Vercel Environment Variable Commands\n');
console.log('# Run these commands in your terminal to set production environment variables:\n');

// First, ensure we're in the right project
console.log('# 1. First, link your Vercel project (if not already done):');
console.log('vercel link\n');

console.log('# 2. Set production environment variables:');

REQUIRED_VARS.forEach(varName => {
  if (envVars[varName]) {
    // For NEXT_PUBLIC vars, also set for preview
    if (varName.startsWith('NEXT_PUBLIC_')) {
      console.log(`vercel env add ${varName} production preview`);
    } else {
      console.log(`vercel env add ${varName} production`);
    }
  } else {
    console.log(`# WARNING: ${varName} not found in .env.local`);
  }
});

console.log('\n# 3. After running the commands above, Vercel will prompt for each value.');
console.log('# Copy the values from your .env.local file when prompted.\n');

// Check for missing required variables
console.log('\n# Missing Required Variables:');
const missingVars = REQUIRED_VARS.filter(v => !envVars[v]);
if (missingVars.length === 0) {
  console.log('# ✅ All required variables are present in .env.local');
} else {
  console.log('# ❌ The following required variables are missing:');
  missingVars.forEach(v => console.log(`#    - ${v}`));
}

// Check for Stripe price IDs that might need updating
console.log('\n# Stripe Price IDs to Verify:');
const stripePriceVars = REQUIRED_VARS.filter(v => v.includes('PRICE_ID'));
stripePriceVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`# ${varName} = ${envVars[varName].substring(0, 20)}...`);
  }
});

console.log('\n# 4. Update production URL:');
console.log('# Make sure to update NEXT_PUBLIC_APP_URL to your production domain');
console.log('# Current value:', envVars.NEXT_PUBLIC_APP_URL || 'NOT SET');

console.log('\n# 5. Generate new CRON_SECRET for production:');
console.log('# Run: openssl rand -base64 32');
console.log('# Current value should NOT be reused in production');

console.log('\n# 6. After all variables are set, redeploy:');
console.log('vercel --prod\n');