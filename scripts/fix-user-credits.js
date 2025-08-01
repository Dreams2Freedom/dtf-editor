#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserCredits(email, correctCredits) {
  console.log(`🔧 Fixing credits for: ${email}\n`);

  try {
    // Get user by email
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError.message);
      return;
    }

    const user = authData.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update profile with correct credits
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        credits_remaining: correctCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message);
      return;
    }

    console.log('\n✅ Credits fixed successfully!');
    console.log(`   Credits Remaining: ${profile.credits_remaining}`);

    // Add a transaction to log this correction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: correctCredits,
        operation: 'admin_correction',
        description: 'Fixed phantom credits issue',
        created_at: new Date().toISOString()
      });

    console.log('\n✅ Transaction logged');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get parameters from command line
const email = process.argv[2] || 'shannonherod@gmail.com';
const credits = parseInt(process.argv[3]) || 0;

if (process.argv.length < 4) {
  console.log('Usage: node fix-user-credits.js <email> <credits>');
  console.log('Example: node fix-user-credits.js shannonherod@gmail.com 0');
  process.exit(1);
}

fixUserCredits(email, credits);