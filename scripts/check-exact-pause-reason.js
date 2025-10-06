#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExactPauseReason() {
  console.log('Checking exact pause eligibility reason...\n');

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(
    u => u.email === 'snsmarketing@gmail.com'
  );

  if (!authUser) {
    console.error('User not found');
    return;
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  console.log('=== PROFILE DATA ===');
  console.log('Pause Count:', profile.pause_count || 0);
  console.log('Last Pause Date:', profile.last_pause_date || 'Never');
  console.log(
    'Subscription Paused Until:',
    profile.subscription_paused_until || 'Not paused'
  );

  // Calculate days since last pause
  if (profile.last_pause_date) {
    const lastPause = new Date(profile.last_pause_date);
    const now = new Date();
    const daysSinceLastPause = Math.floor(
      (now - lastPause) / (1000 * 60 * 60 * 24)
    );
    console.log('Days Since Last Pause:', daysSinceLastPause);
  }

  // Call the RPC function
  console.log('\n=== CALLING RPC FUNCTION ===');
  const { data: eligibility, error } = await supabase.rpc(
    'check_pause_eligibility',
    { p_user_id: authUser.id }
  );

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('Raw RPC Response:', eligibility);

    if (Array.isArray(eligibility) && eligibility.length > 0) {
      const result = eligibility[0];
      console.log('\n=== ELIGIBILITY RESULT ===');
      console.log('Can Pause:', result.can_pause);
      console.log('Reason:', result.reason);
      console.log('Pause Count:', result.pause_count);

      if (!result.can_pause) {
        console.log('\n❌ USER CANNOT PAUSE');
        console.log('Reason:', result.reason);
      } else {
        console.log('\n✅ USER CAN PAUSE');
      }
    }
  }

  // Count pauses this year manually
  const currentYear = new Date().getFullYear();
  console.log('\n=== CHECKING PAUSE LIMIT ===');
  console.log('Current Year:', currentYear);
  console.log('Profile shows pause count:', profile.pause_count);

  // The pause eligibility function checks if:
  // 1. Already paused (subscription_paused_until > NOW())
  // 2. Reached yearly limit (2 pauses per year)
  // 3. Too soon after last pause (7-day waiting period - but we removed this)
}

checkExactPauseReason();
