#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEligibility() {
  console.log('Testing retention eligibility functions...\n');

  // Get a test user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('subscription_status', 'active')
    .limit(1);

  if (userError || !users?.length) {
    console.error('No active subscription users found');
    return;
  }

  const user = users[0];
  console.log(`Testing with user: ${user.email}`);
  console.log(`Current status: ${user.subscription_status}`);
  console.log(`Pause count: ${user.pause_count || 0}`);
  console.log(`Discount count: ${user.discount_used_count || 0}\n`);

  // Test pause eligibility
  try {
    const { data: pauseEligibility, error: pauseError } = await supabase.rpc(
      'check_pause_eligibility',
      { p_user_id: user.id }
    );

    if (pauseError) {
      console.error('Pause eligibility error:', pauseError);
    } else {
      console.log('Pause Eligibility:', pauseEligibility);
    }
  } catch (err) {
    console.error('Error checking pause eligibility:', err);
  }

  // Test discount eligibility
  try {
    const { data: discountEligibility, error: discountError } =
      await supabase.rpc('check_discount_eligibility', { p_user_id: user.id });

    if (discountError) {
      console.error('Discount eligibility error:', discountError);
    } else {
      console.log('\nDiscount Eligibility:', discountEligibility);
    }
  } catch (err) {
    console.error('Error checking discount eligibility:', err);
  }

  // Check if functions exist
  const { data: functions, error: funcError } = await supabase
    .rpc('exec_sql', {
      query:
        "SELECT proname FROM pg_proc WHERE proname IN ('check_pause_eligibility', 'check_discount_eligibility')",
    })
    .catch(() => ({ data: null, error: 'exec_sql not available' }));

  if (funcError) {
    console.log(
      '\nNote: Could not verify functions directly, but they should exist if no errors above.'
    );
  }
}

testEligibility();
