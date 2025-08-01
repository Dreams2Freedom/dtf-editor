#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkProfile() {
  console.log('🔍 Checking user profile...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // The user ID from the error logs
  const userId = 'f689bb22-89dd-4c3c-a941-d77feb84428d';

  try {
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('❌ Error fetching auth user:', authError.message);
    } else {
      console.log('✅ Auth user found:', authUser.user.email);
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Profile not found:', profileError.message);
      console.log('\n🔧 Creating profile for user...');
      
      // Create the profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user.email,
          credits_remaining: 2,
          subscription_status: 'free',
          subscription_plan: 'free',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError.message);
      } else {
        console.log('✅ Profile created successfully!');
        console.log('   Credits: 2');
        console.log('   Plan: free');
      }
    } else {
      console.log('✅ Profile exists:');
      console.log('   Email:', profile.email);
      console.log('   Credits:', profile.credits_remaining);
      console.log('   Plan:', profile.subscription_plan);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProfile();