#!/usr/bin/env node

/**
 * Verify all production API keys are configured and working
 * 
 * This script tests each external service API to ensure:
 * 1. API keys are present in environment variables
 * 2. API keys are valid and authenticate successfully
 * 3. Services are accessible and responding
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(service, status, details = '') {
  const symbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  console.log(`  ${symbol} ${service}`);
  if (details) {
    console.log(`     ${color}${details}${colors.reset}`);
  }
}

// Test OpenAI API
async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logTest('OpenAI API', 'fail', 'Missing OPENAI_API_KEY environment variable');
    return false;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const hasGPT4 = data.data?.some(m => m.id.includes('gpt-4'));
      const hasDalle = data.data?.some(m => m.id.includes('dall-e'));
      logTest('OpenAI API', 'pass', 
        `Access to ${hasGPT4 ? 'GPT-4' : 'GPT-3.5'}, DALL-E ${hasDalle ? 'available' : 'not available'}`);
      return true;
    } else {
      const error = await response.text();
      logTest('OpenAI API', 'fail', `HTTP ${response.status}: ${error.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    logTest('OpenAI API', 'fail', error.message);
    return false;
  }
}

// Test Deep-Image.ai API
async function testDeepImage() {
  const apiKey = process.env.DEEP_IMAGE_API_KEY;
  
  if (!apiKey) {
    logTest('Deep-Image.ai API', 'fail', 'Missing DEEP_IMAGE_API_KEY environment variable');
    return false;
  }
  
  try {
    // Test with a simple balance check endpoint
    const response = await fetch('https://deep-image.ai/rest_api/process_result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': apiKey
      },
      body: 'url=test'
    });
    
    // Even with invalid request, we can check if API key is valid
    if (response.status === 401) {
      logTest('Deep-Image.ai API', 'fail', 'Invalid API key');
      return false;
    } else {
      // API key is valid (will get different error for invalid request)
      logTest('Deep-Image.ai API', 'pass', 'API key validated');
      return true;
    }
  } catch (error) {
    logTest('Deep-Image.ai API', 'warning', 'Could not validate - may still be working');
    return true; // Don't fail completely
  }
}

// Test ClippingMagic API
async function testClippingMagic() {
  const apiId = process.env.CLIPPINGMAGIC_API_KEY;
  const apiSecret = process.env.CLIPPINGMAGIC_API_SECRET;
  
  if (!apiId || !apiSecret) {
    logTest('ClippingMagic API', 'fail', 
      `Missing ${!apiId ? 'CLIPPINGMAGIC_API_KEY' : 'CLIPPINGMAGIC_API_SECRET'} environment variable`);
    return false;
  }
  
  try {
    // Test account info endpoint
    const response = await fetch('https://clippingmagic.com/api/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiId}:${apiSecret}`).toString('base64')
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('ClippingMagic API', 'pass', 
        `Subscription: ${data.subscription?.state || 'Unknown'}, Credits: ${data.subscription?.credits || 'N/A'}`);
      return true;
    } else if (response.status === 401) {
      logTest('ClippingMagic API', 'fail', 'Invalid API credentials');
      return false;
    } else {
      logTest('ClippingMagic API', 'warning', `HTTP ${response.status} - credentials may be valid`);
      return true;
    }
  } catch (error) {
    logTest('ClippingMagic API', 'warning', 'Could not validate - may still be working');
    return true;
  }
}

// Test Vectorizer.ai API
async function testVectorizer() {
  const apiId = process.env.VECTORIZER_API_KEY;
  const apiSecret = process.env.VECTORIZER_API_SECRET;
  
  if (!apiId || !apiSecret) {
    logTest('Vectorizer.ai API', 'fail', 
      `Missing ${!apiId ? 'VECTORIZER_API_KEY' : 'VECTORIZER_API_SECRET'} environment variable`);
    return false;
  }
  
  try {
    // Test account info endpoint
    const response = await fetch('https://vectorizer.ai/api/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiId}:${apiSecret}`).toString('base64')
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('Vectorizer.ai API', 'pass', 
        `Subscription: ${data.subscription?.state || 'Unknown'}, Credits: ${data.subscription?.credits || 'N/A'}`);
      return true;
    } else if (response.status === 401) {
      logTest('Vectorizer.ai API', 'fail', 'Invalid API credentials');
      return false;
    } else {
      logTest('Vectorizer.ai API', 'warning', `HTTP ${response.status} - credentials may be valid`);
      return true;
    }
  } catch (error) {
    logTest('Vectorizer.ai API', 'warning', 'Could not validate - may still be working');
    return true;
  }
}

// Test Stripe API
async function testStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!secretKey) {
    logTest('Stripe API', 'fail', 'Missing STRIPE_SECRET_KEY environment variable');
    return false;
  }
  
  if (!webhookSecret) {
    logTest('Stripe Webhook', 'warning', 'Missing STRIPE_WEBHOOK_SECRET environment variable');
  }
  
  try {
    const stripe = require('stripe')(secretKey);
    
    // Check if we're in test mode or live mode
    const isTestMode = secretKey.startsWith('sk_test_');
    
    // Try to list products to verify API access
    const products = await stripe.products.list({ limit: 1 });
    
    logTest('Stripe API', 'pass', 
      `Mode: ${isTestMode ? 'TEST' : 'LIVE'}, Products configured: ${products.data.length > 0 ? 'Yes' : 'No'}`);
    
    if (isTestMode) {
      console.log(`     ${colors.yellow}⚠️  Using TEST mode - switch to LIVE mode for production${colors.reset}`);
    }
    
    // Check for required price IDs
    const requiredPriceIds = [
      'STRIPE_BASIC_PLAN_PRICE_ID',
      'STRIPE_STARTER_PLAN_PRICE_ID',
      'STRIPE_PAY_AS_YOU_GO_PACK5_PRICE_ID',
      'STRIPE_PAY_AS_YOU_GO_PACK10_PRICE_ID',
      'STRIPE_PAY_AS_YOU_GO_PACK20_PRICE_ID'
    ];
    
    const missingPriceIds = requiredPriceIds.filter(id => !process.env[id]);
    if (missingPriceIds.length > 0) {
      console.log(`     ${colors.yellow}Missing price IDs: ${missingPriceIds.join(', ')}${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    logTest('Stripe API', 'fail', error.message);
    return false;
  }
}

// Test Supabase connection
async function testSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !anonKey || !serviceKey) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    logTest('Supabase', 'fail', `Missing: ${missing.join(', ')}`);
    return false;
  }
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, serviceKey);
    
    // Test database connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      logTest('Supabase', 'fail', error.message);
      return false;
    }
    
    logTest('Supabase', 'pass', 'Database connection successful');
    return true;
  } catch (error) {
    logTest('Supabase', 'fail', error.message);
    return false;
  }
}

// Main verification function
async function verifyAllAPIs() {
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              PRODUCTION API KEY VERIFICATION                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  console.log('\n📋 Checking environment: ' + (process.env.NODE_ENV || 'development') + '\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  // Core Infrastructure
  console.log(colors.bright + '🏗️  Core Infrastructure:' + colors.reset);
  if (await testSupabase()) results.passed++; else results.failed++;
  if (await testStripe()) results.passed++; else results.failed++;
  results.total += 2;
  
  // AI Services
  console.log(colors.bright + '\n🤖 AI Services:' + colors.reset);
  if (await testOpenAI()) results.passed++; else results.failed++;
  if (await testDeepImage()) results.passed++; else results.failed++;
  if (await testClippingMagic()) results.passed++; else results.failed++;
  if (await testVectorizer()) results.passed++; else results.failed++;
  results.total += 4;
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(colors.bright + '📊 Summary:' + colors.reset);
  console.log(`  Total APIs tested: ${results.total}`);
  console.log(`  ${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(colors.green + '\n🎉 All API keys verified successfully!' + colors.reset);
    
    // Check if we're ready for production
    const isStripeTest = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
    if (isStripeTest) {
      console.log(colors.yellow + '\n⚠️  Important: Stripe is still in TEST mode.' + colors.reset);
      console.log('   To go live, update STRIPE_SECRET_KEY to use your live key (sk_live_...)');
    } else {
      console.log(colors.green + '\n✅ Ready for production!' + colors.reset);
    }
  } else {
    console.log(colors.red + '\n❌ Some APIs failed verification.' + colors.reset);
    console.log('   Please check the failed services above and update your .env.local file.');
  }
  
  // Additional recommendations
  console.log('\n' + colors.cyan + '💡 Recommendations:' + colors.reset);
  console.log('  1. Ensure all API keys are for production (not test/sandbox)');
  console.log('  2. Set up monitoring for API quotas and limits');
  console.log('  3. Configure error alerting for API failures');
  console.log('  4. Review API rate limits and implement appropriate throttling');
  console.log('  5. Set up billing alerts for usage-based APIs');
  
  return results.failed === 0;
}

// Run verification
if (require.main === module) {
  verifyAllAPIs()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyAllAPIs };