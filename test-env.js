#!/usr/bin/env node

// 🔧 DTF Editor - Environment Configuration Test
// This script tests that all required environment variables are set

require('dotenv').config();

console.log('🔧 DTF Editor - Environment Configuration Test');
console.log('==============================================');
console.log('');

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

// Test optional but recommended variables
const recommended = [
  'GOHIGHLEVEL_API_KEY',
  'RAILWAY_TOKEN',
  'SESSION_SECRET',
  'COOKIE_SECRET',
];

let allRequired = true;
let missingRecommended = [];

console.log('📋 Testing Required Variables:');
console.log('===============================');

required.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`❌ Missing: ${varName}`);
    allRequired = false;
  } else {
    const value = process.env[varName];
    const maskedValue =
      value.length > 8
        ? value.substring(0, 4) + '...' + value.substring(value.length - 4)
        : '***';
    console.log(`✅ Found: ${varName} = ${maskedValue}`);
  }
});

console.log('');
console.log('📋 Testing Recommended Variables:');
console.log('==================================');

recommended.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`⚠️  Missing: ${varName} (recommended)`);
    missingRecommended.push(varName);
  } else {
    const value = process.env[varName];
    const maskedValue =
      value.length > 8
        ? value.substring(0, 4) + '...' + value.substring(value.length - 4)
        : '***';
    console.log(`✅ Found: ${varName} = ${maskedValue}`);
  }
});

console.log('');
console.log('🔍 Testing Configuration Values:');
console.log('=================================');

// Test configuration values
const configs = [
  { name: 'NODE_ENV', value: process.env.NODE_ENV, expected: 'development' },
  { name: 'PORT', value: process.env.PORT, expected: '3000' },
  {
    name: 'FREE_TIER_CREDITS',
    value: process.env.FREE_TIER_CREDITS,
    expected: '2',
  },
  {
    name: 'MAX_FILE_SIZE',
    value: process.env.MAX_FILE_SIZE,
    expected: '10485760',
  },
];

configs.forEach(config => {
  if (config.value === config.expected) {
    console.log(`✅ ${config.name} = ${config.value}`);
  } else if (config.value) {
    console.log(
      `⚠️  ${config.name} = ${config.value} (expected: ${config.expected})`
    );
  } else {
    console.log(`❌ Missing: ${config.name}`);
  }
});

console.log('');
console.log('📊 Test Results:');
console.log('================');

if (allRequired) {
  console.log('🎉 All required variables are set!');
  console.log('✅ Environment is ready for development');
} else {
  console.log('❌ Some required variables are missing');
  console.log('⚠️  Please check the ENVIRONMENT_SETUP_GUIDE.md');
}

if (missingRecommended.length > 0) {
  console.log('');
  console.log('⚠️  Missing recommended variables:');
  missingRecommended.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
  console.log(
    '💡 These are not required but recommended for full functionality'
  );
}

console.log('');
console.log('📋 Next Steps:');
console.log('==============');

if (allRequired) {
  console.log('1. ✅ Environment is configured');
  console.log('2. 🗄️  Set up database schema');
  console.log('3. 🚀 Start building the application');
} else {
  console.log('1. ❌ Fix missing environment variables');
  console.log('2. 📖 Follow ENVIRONMENT_SETUP_GUIDE.md');
  console.log('3. 🔄 Run this test again');
}

console.log('');
console.log('📚 Documentation:');
console.log('==================');
console.log('- PRD: DTF_EDITOR_PRD.md');
console.log('- Database Schema: DATABASE_SCHEMA.md');
console.log('- Environment Setup: ENVIRONMENT_SETUP_GUIDE.md');
console.log('');
