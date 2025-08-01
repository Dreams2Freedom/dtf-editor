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

async function checkUserCredits(email) {
  console.log(`🔍 Checking credits for: ${email}\n`);

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

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
      return;
    }

    console.log('\n📊 Profile Data:');
    console.log(`   Email: ${profile.email}`);
    console.log(`   Credits: ${profile.credits}`);
    console.log(`   Credits Remaining: ${profile.credits_remaining}`);
    console.log(`   Plan: ${profile.subscription_plan}`);
    console.log(`   Status: ${profile.subscription_status}`);
    console.log(`   Updated: ${profile.updated_at}`);

    // Get recent credit transactions
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!txError && transactions && transactions.length > 0) {
      console.log('\n📝 Recent Credit Transactions:');
      transactions.forEach(tx => {
        const sign = tx.operation.includes('deduct') ? '-' : '+';
        console.log(`   ${sign}${tx.amount} - ${tx.operation} - ${tx.description || 'No description'} - ${new Date(tx.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get email from command line
const email = process.argv[2] || 'Shannonherod@gmail.com';
checkUserCredits(email);