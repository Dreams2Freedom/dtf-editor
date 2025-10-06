const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧪 To test automatic credit addition through webhooks:\n');
console.log('1. Go to your dashboard: http://localhost:3000/dashboard');
console.log('2. Click "Buy Credits"');
console.log('3. Purchase 10 credits for $7.99');
console.log('4. After payment, check if credits increase from 502 to 512\n');
console.log('This will confirm that:');
console.log('- Webhooks are working');
console.log('- Credits are added automatically');
console.log('- The entire payment flow is functional\n');
console.log('Your current balance: checking...\n');

// Check current balance
async function checkBalance() {
  const { data } = await supabase
    .from('profiles')
    .select('credits_remaining')
    .eq('id', 'f689bb22-89dd-4c3c-a941-d77feb84428d')
    .single();

  console.log('Current credits:', data?.credits_remaining);
}

checkBalance();
