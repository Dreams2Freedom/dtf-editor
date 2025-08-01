#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceResetRetention() {
  console.log('Force resetting all retention data for testing...\n');
  
  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === 'snsmarketing@gmail.com');
  
  if (!authUser) {
    console.error('User not found');
    return;
  }

  // Reset discount and pause usage
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      discount_used_count: 0,
      last_discount_date: null,
      pause_count: 0,
      last_pause_date: null,
      subscription_paused_until: null
    })
    .eq('id', authUser.id);

  if (updateError) {
    console.error('Error resetting profile:', updateError);
  } else {
    console.log('✓ Profile retention data reset successfully');
  }

  // Delete all retention-related events from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { error: deleteError } = await supabase
    .from('subscription_events')
    .delete()
    .eq('user_id', authUser.id)
    .in('event_type', ['discount_offered', 'discount_used', 'subscription_paused'])
    .gte('created_at', today.toISOString());

  if (deleteError) {
    console.error('Error deleting events:', deleteError);
  } else {
    console.log('✓ Retention events deleted');
  }
  
  // Verify the reset
  const { data: profile } = await supabase
    .from('profiles')
    .select('discount_used_count, last_discount_date, pause_count, last_pause_date')
    .eq('id', authUser.id)
    .single();
    
  console.log('\n=== VERIFICATION ===');
  console.log('Discount Used Count:', profile.discount_used_count);
  console.log('Last Discount Date:', profile.last_discount_date);
  console.log('Pause Count:', profile.pause_count);
  console.log('Last Pause Date:', profile.last_pause_date);
  
  // Check eligibility
  console.log('\n=== CHECKING ELIGIBILITY ===');
  
  const { data: pauseElig } = await supabase
    .rpc('check_pause_eligibility', { p_user_id: authUser.id });
  
  const { data: discountElig } = await supabase
    .rpc('check_discount_eligibility', { p_user_id: authUser.id });
    
  console.log('Pause Eligibility:', pauseElig);
  console.log('Discount Eligibility:', discountElig);
}

forceResetRetention();