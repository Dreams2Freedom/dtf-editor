#!/usr/bin/env node

/**
 * Clean up ALL test data from database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function cleanup() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Cleaning up ALL test data...\n');

  // Get all profiles with test emails
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email')
    .or('email.like.%test%,email.like.%example.com%');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  console.log(`Found ${profiles?.length || 0} test profiles to clean up\n`);
  
  for (const profile of profiles || []) {
    console.log(`Cleaning up: ${profile.email}`);
    
    try {
      // Delete transactions
      await supabase
        .from('credit_transactions')
        .delete()
        .eq('user_id', profile.id);
      console.log('  ✓ Deleted transactions');
      
      // Delete processed images
      await supabase
        .from('processed_images')
        .delete()
        .eq('user_id', profile.id);
      console.log('  ✓ Deleted processed images');
      
      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);
      console.log('  ✓ Deleted profile');
      
      // Try to delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(profile.id);
      if (!authError) {
        console.log('  ✓ Deleted auth user');
      } else if (authError.message?.includes('not found')) {
        console.log('  ⚠️  No auth user found (already deleted)');
      } else {
        console.log('  ⚠️  Could not delete auth user:', authError.message);
      }
      
      console.log('');
    } catch (err) {
      console.error(`  ❌ Error cleaning up ${profile.email}:`, err.message);
    }
  }
  
  console.log('✅ Cleanup complete!');
}

cleanup().catch(console.error);