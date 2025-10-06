#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPauseEligibility() {
  console.log('Checking pause eligibility for snsmarketing@gmail.com...\n');

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(
    u => u.email === 'snsmarketing@gmail.com'
  );

  if (!authUser) {
    console.error('User not found');
    return;
  }

  // Check pause eligibility
  const { data: eligibility, error } = await supabase.rpc(
    'check_pause_eligibility',
    { p_user_id: authUser.id }
  );

  console.log('=== PAUSE ELIGIBILITY ===');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Can Pause:', eligibility?.can_pause || false);
    console.log('Reason:', eligibility?.reason || 'N/A');
    console.log('Pause Count:', eligibility?.pause_count || 0);
  }

  // Check subscription events
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', authUser.id)
    .eq('event_type', 'subscription_paused')
    .order('created_at', { ascending: false });

  console.log('\n=== PAUSE HISTORY ===');
  if (events && events.length > 0) {
    console.log('Total Pauses:', events.length);
    const thisYear = events.filter(
      e => new Date(e.created_at).getFullYear() === new Date().getFullYear()
    );
    console.log('Pauses This Year:', thisYear.length);

    if (events[0]) {
      console.log('\nLast Pause:');
      console.log('Date:', new Date(events[0].created_at).toLocaleDateString());
      console.log('Duration:', events[0].event_data?.duration);
    }
  } else {
    console.log('No pause history found');
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  console.log('\n=== PROFILE STATUS ===');
  console.log('Subscription Status:', profile?.subscription_status);
  console.log(
    'Paused Until:',
    profile?.subscription_paused_until || 'Not paused'
  );
  console.log('Pause Count:', profile?.pause_count || 0);
}

checkPauseEligibility();
