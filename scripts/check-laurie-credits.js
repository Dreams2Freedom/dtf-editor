#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
  const email = 'lround@icloud.com';
  console.log(`\nChecking for user: ${email}\n`);

  try {
    // Get all users and find the one with matching email
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Created: ${new Date(user.created_at).toLocaleString()}`);

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      console.log('\n📊 PROFILE:');
      console.log(`  - Credits: ${profile.credits_remaining}`);
      console.log(
        `  - Subscription Tier: ${profile.subscription_tier || 'free'}`
      );
      console.log(
        `  - Stripe Customer ID: ${profile.stripe_customer_id || 'None'}`
      );
    }

    // Get credit transactions
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (transactions && transactions.length > 0) {
      console.log('\n💰 CREDIT TRANSACTION HISTORY:');
      transactions.forEach((tx, i) => {
        console.log(`\n[${i + 1}] ${new Date(tx.created_at).toLocaleString()}`);
        console.log(`    Type: ${tx.transaction_type}`);
        console.log(`    Amount: ${tx.amount > 0 ? '+' : ''}${tx.amount}`);
        console.log(`    Description: ${tx.description}`);
        console.log(`    Balance After: ${tx.balance_after}`);
      });
    } else {
      console.log('\n💰 No credit transactions found');
    }

    // Check for Stripe payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (payments && payments.length > 0) {
      console.log('\n💳 PAYMENT HISTORY:');
      payments.forEach((payment, i) => {
        console.log(
          `\n[${i + 1}] ${new Date(payment.created_at).toLocaleString()}`
        );
        console.log(`    Amount: $${payment.amount / 100}`);
        console.log(`    Type: ${payment.payment_type}`);
        console.log(`    Status: ${payment.status}`);
      });
    } else {
      console.log('\n💳 No payments found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser().catch(console.error);

// Additional check - look for Stripe sessions
async function checkStripeData() {
  const email = 'lround@icloud.com';

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();
  const user = users?.find(u => u.email === email);

  if (user) {
    // Check admin audit logs
    const { data: auditLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('target_user_id', user.id)
      .order('created_at', { ascending: false });

    if (auditLogs && auditLogs.length > 0) {
      console.log('\n🔍 ADMIN AUDIT LOGS:');
      auditLogs.forEach((log, i) => {
        console.log(
          `\n[${i + 1}] ${new Date(log.created_at).toLocaleString()}`
        );
        console.log(`    Action: ${log.action}`);
        console.log(`    Admin: ${log.admin_email}`);
        console.log(`    Details: ${log.details}`);
      });
    }
  }
}

checkStripeData().catch(console.error);
