#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugEligibility() {
  console.log('Debugging eligibility checks...\n');

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === 'snsmarketing@gmail.com');
  
  if (!authUser) {
    console.error('User not found');
    return;
  }

  console.log('User ID:', authUser.id);
  console.log('User Email:', authUser.email);

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError) {
    console.error('Profile error:', profileError);
    return;
  }

  console.log('\n=== PROFILE DATA ===');
  console.log('Created At:', profile.created_at);
  console.log('Last Discount Date:', profile.last_discount_date || 'NULL');
  console.log('Discount Used Count:', profile.discount_used_count || 0);
  console.log('Pause Count:', profile.pause_count || 0);
  console.log('Subscription Status:', profile.subscription_status);

  // Test discount eligibility with direct RPC call
  console.log('\n=== TESTING DISCOUNT ELIGIBILITY RPC ===');
  const { data: discountElig, error: discountError } = await supabase
    .rpc('check_discount_eligibility', { p_user_id: authUser.id });

  if (discountError) {
    console.error('Discount eligibility error:', discountError);
  } else {
    console.log('RPC Response:', discountElig);
    if (discountElig && discountElig.length > 0) {
      console.log('Can Use Discount:', discountElig[0].can_use_discount);
      console.log('Reason:', discountElig[0].reason);
      console.log('Discount Used Count:', discountElig[0].discount_used_count);
    } else {
      console.log('Empty response from RPC');
    }
  }

  // Test pause eligibility
  console.log('\n=== TESTING PAUSE ELIGIBILITY RPC ===');
  const { data: pauseElig, error: pauseError } = await supabase
    .rpc('check_pause_eligibility', { p_user_id: authUser.id });

  if (pauseError) {
    console.error('Pause eligibility error:', pauseError);
  } else {
    console.log('RPC Response:', pauseElig);
    if (pauseElig && pauseElig.length > 0) {
      console.log('Can Pause:', pauseElig[0].can_pause);
      console.log('Reason:', pauseElig[0].reason);
      console.log('Pause Count:', pauseElig[0].pause_count);
    } else {
      console.log('Empty response from RPC');
    }
  }

  // Check events
  console.log('\n=== CHECKING EVENTS ===');
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (events && events.length > 0) {
    console.log('Recent events:');
    events.forEach(event => {
      console.log(`- ${event.event_type} at ${new Date(event.created_at).toLocaleDateString()}`);
    });
  } else {
    console.log('No events found');
  }
}

debugEligibility();