#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetDiscount() {
  console.log('Resetting discount usage for testing...\n');

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(
    u => u.email === 'snsmarketing@gmail.com'
  );

  if (!authUser) {
    console.error('User not found');
    return;
  }

  // Reset discount usage
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      discount_used_count: 0,
      last_discount_date: null,
    })
    .eq('id', authUser.id);

  if (updateError) {
    console.error('Error resetting discount:', updateError);
  } else {
    console.log('✓ Discount usage reset successfully');
  }

  // Delete recent discount events
  const { error: deleteError } = await supabase
    .from('subscription_events')
    .delete()
    .eq('user_id', authUser.id)
    .eq('event_type', 'discount_used');

  if (deleteError) {
    console.error('Error deleting discount events:', deleteError);
  } else {
    console.log('✓ Discount events deleted');
  }

  // Verify the reset
  const { data: profile } = await supabase
    .from('profiles')
    .select('discount_used_count, last_discount_date')
    .eq('id', authUser.id)
    .single();

  console.log('\n=== VERIFICATION ===');
  console.log('Discount Used Count:', profile.discount_used_count);
  console.log('Last Discount Date:', profile.last_discount_date);
}

resetDiscount();
