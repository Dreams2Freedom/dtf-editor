#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

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

console.log('# Current Environment Values for DTFEditor.com\n');
console.log('## Copy these values to Vercel Environment Variables:\n');

// Supabase
console.log('### Supabase');
console.log(`NEXT_PUBLIC_SUPABASE_URL=${envVars.NEXT_PUBLIC_SUPABASE_URL || 'NOT_FOUND'}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT_FOUND'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${envVars.SUPABASE_SERVICE_ROLE_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log('');

// AI Services
console.log('### AI Services');
console.log(`DEEP_IMAGE_API_KEY=${envVars.DEEP_IMAGE_API_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log(`CLIPPINGMAGIC_API_KEY=${envVars.CLIPPINGMAGIC_API_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log(`CLIPPINGMAGIC_API_SECRET=${envVars.CLIPPINGMAGIC_API_SECRET ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log(`VECTORIZER_API_KEY=${envVars.VECTORIZER_API_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log(`VECTORIZER_API_SECRET=${envVars.VECTORIZER_API_SECRET ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log(`OPENAI_API_KEY=${envVars.OPENAI_API_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log('');

// Stripe
console.log('### Stripe');
console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${envVars.STRIPE_PUBLISHABLE_KEY || 'NOT_FOUND'}`);
console.log(`STRIPE_SECRET_KEY=${envVars.STRIPE_SECRET_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log('STRIPE_WEBHOOK_SECRET=[WILL_BE_SET_AFTER_WEBHOOK_CREATION]');
console.log('');

// Mailgun
console.log('### Mailgun');
console.log(`MAILGUN_API_KEY=${envVars.MAILGUN_API_KEY ? '[HIDDEN]' : 'NOT_FOUND'}`);
console.log(`MAILGUN_DOMAIN=${envVars.MAILGUN_DOMAIN || 'mg.dtfeditor.com'}`);
console.log(`MAILGUN_FROM_EMAIL=${envVars.MAILGUN_FROM_EMAIL || 'noreply@mg.dtfeditor.com'}`);
console.log(`MAILGUN_FROM_NAME=${envVars.MAILGUN_FROM_NAME || 'DTF Editor'}`);
console.log('');

// App Config
console.log('### App Configuration');
console.log('NEXT_PUBLIC_APP_URL=https://dtfeditor.com');
console.log('CRON_SECRET=[GENERATE_NEW_WITH: openssl rand -base64 32]');
console.log('');

// Generate CRON secret
const { execSync } = require('child_process');
const cronSecret = execSync('openssl rand -base64 32').toString().trim();
console.log(`\n### Generated CRON_SECRET for production:\n${cronSecret}`);

console.log('\n### Stripe Webhook URL:');
console.log('https://dtfeditor.com/api/webhooks/stripe');

console.log('\n### Important Notes:');
console.log('1. DO NOT copy hidden values from this output');
console.log('2. Get the actual values from your .env.local file');
console.log('3. Update MAILGUN_DOMAIN if you\'re using a different domain');
console.log('4. Make sure Stripe keys are for production, not test mode');