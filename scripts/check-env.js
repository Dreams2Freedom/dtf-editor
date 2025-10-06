const dotenv = require('dotenv');
const path = require('path');

console.log('\n=== Environment Variables Check ===\n');

// Load .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
const result = dotenv.config({ path: envLocalPath });

if (result.error) {
  console.error('Error loading .env.local:', result.error);
} else {
  console.log('✅ .env.local loaded successfully');
}

// Check Supabase variables
console.log('\n📌 Supabase Configuration:');
console.log(
  'NEXT_PUBLIC_SUPABASE_URL:',
  process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'
);
console.log(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY:',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  'SUPABASE_SERVICE_ROLE_KEY:',
  process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'
);

// Check AI service variables
console.log('\n🤖 AI Services:');
console.log(
  'DEEP_IMAGE_API_KEY:',
  process.env.DEEP_IMAGE_API_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  'CLIPPINGMAGIC_API_KEY:',
  process.env.CLIPPINGMAGIC_API_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  'VECTORIZER_API_KEY:',
  process.env.VECTORIZER_API_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  'OPENAI_API_KEY:',
  process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'
);

// Check Stripe variables
console.log('\n💳 Stripe Configuration:');
console.log(
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:',
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  'STRIPE_SECRET_KEY:',
  process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing'
);

// Test Supabase connection
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  console.log('\n🔍 Testing Supabase URL format:');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log('URL:', url);
  console.log(
    'Looks valid?',
    url.includes('.supabase.co') ? '✅ Yes' : '⚠️  Check format'
  );
}

console.log('\n');
