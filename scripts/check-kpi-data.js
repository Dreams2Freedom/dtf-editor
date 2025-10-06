const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKPIData() {
  console.log('=== Checking KPI Related Data ===\n');

  // 1. Check users and their subscription status
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select(
      'id, created_at, subscription_plan, subscription_status, last_activity_at, email'
    )
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log(`Total users in database: ${users.length}`);

  // Count by subscription status - check by plan since status might not be set correctly
  const paidPlans = ['basic', 'starter', 'professional', 'pro'];
  const paidUsers = users.filter(
    u =>
      paidPlans.includes(u.subscription_plan) ||
      u.subscription_status === 'active' ||
      u.subscription_status === 'trialing'
  );
  const freeUsers = users.filter(
    u =>
      u.subscription_plan === 'free' ||
      !u.subscription_plan ||
      (!paidPlans.includes(u.subscription_plan) &&
        u.subscription_status !== 'active' &&
        u.subscription_status !== 'trialing')
  );

  console.log(`\n=== User Statistics ===`);
  console.log(`- Total users: ${users.length}`);
  console.log(`- Paid users (active or trialing): ${paidUsers.length}`);
  console.log(`- Free users: ${freeUsers.length}`);
  console.log(
    `- Users with subscription_status 'active': ${users.filter(u => u.subscription_status === 'active').length}`
  );
  console.log(
    `- Users with subscription_status 'trialing': ${users.filter(u => u.subscription_status === 'trialing').length}`
  );
  console.log(
    `- Users with null subscription_status: ${users.filter(u => !u.subscription_status).length}`
  );

  // Count by plan
  const planCounts = {};
  users.forEach(u => {
    const plan = u.subscription_plan || 'null';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });

  console.log(`\n=== Users by Plan ===`);
  Object.entries(planCounts).forEach(([plan, count]) => {
    console.log(`- ${plan}: ${count}`);
  });

  // Show sample users
  console.log('\n=== Sample User Data (first 5) ===');
  users.slice(0, 5).forEach((user, i) => {
    console.log(`User ${i + 1}:`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Plan: ${user.subscription_plan || 'null'}`);
    console.log(`  - Status: ${user.subscription_status || 'null'}`);
    console.log(`  - Created: ${user.created_at}`);
  });

  // 2. Check credit transactions for revenue
  const { data: transactions, error: transError } = await supabase
    .from('credit_transactions')
    .select('amount, metadata, type, created_at, user_id')
    .in('type', ['purchase', 'subscription']);

  if (!transError && transactions) {
    console.log(`\n=== Credit Transactions ===`);
    console.log(`Total transactions: ${transactions.length}`);

    // Calculate revenue
    let totalRevenue = 0;
    let transactionsWithPrice = 0;

    transactions.forEach(t => {
      const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
      if (price > 0) {
        totalRevenue += price / 100; // Convert cents to dollars
        transactionsWithPrice++;
      }
    });

    console.log(`- Transactions with price data: ${transactionsWithPrice}`);
    console.log(`- Total revenue: $${totalRevenue.toFixed(2)}`);

    // Show sample transactions
    if (transactions.length > 0) {
      console.log('\nSample transactions (first 3):');
      transactions.slice(0, 3).forEach((t, i) => {
        console.log(`Transaction ${i + 1}:`);
        console.log(`  - Type: ${t.type}`);
        console.log(`  - Credits: ${t.amount}`);
        console.log(
          `  - Price: $${t.metadata?.price_paid ? (t.metadata.price_paid / 100).toFixed(2) : 'N/A'}`
        );
        console.log(
          `  - Metadata: ${JSON.stringify(t.metadata).substring(0, 100)}`
        );
      });
    }
  }

  // 3. Calculate what the metrics SHOULD be
  console.log('\n=== Expected Metric Values ===');

  const totalUserBase = users.length;
  const paidUsersCount = paidUsers.length;
  const conversionRate =
    totalUserBase > 0 ? (paidUsersCount / totalUserBase) * 100 : 0;

  console.log(`\nConversion Rate Calculation:`);
  console.log(`- Formula: (paid users / total users) × 100`);
  console.log(`- Calculation: (${paidUsersCount} / ${totalUserBase}) × 100`);
  console.log(`- Expected Conversion Rate: ${conversionRate.toFixed(2)}%`);

  // ARPU Calculation - count users with paid plans regardless of status field
  const basicCount = users.filter(u => u.subscription_plan === 'basic').length;
  const starterCount = users.filter(
    u => u.subscription_plan === 'starter'
  ).length;
  const proCount = users.filter(
    u => u.subscription_plan === 'professional' || u.subscription_plan === 'pro'
  ).length;

  const mrr = basicCount * 9.99 + starterCount * 24.99 + proCount * 49.99;
  const arpu = paidUsersCount > 0 ? mrr / paidUsersCount : 0;

  console.log(`\nARPU Calculation:`);
  console.log(
    `- Active Basic subscribers: ${basicCount} × $9.99 = $${(basicCount * 9.99).toFixed(2)}`
  );
  console.log(
    `- Active Starter subscribers: ${starterCount} × $24.99 = $${(starterCount * 24.99).toFixed(2)}`
  );
  console.log(
    `- Active Pro subscribers: ${proCount} × $49.99 = $${(proCount * 49.99).toFixed(2)}`
  );
  console.log(`- Total MRR: $${mrr.toFixed(2)}`);
  console.log(`- Expected ARPU: $${arpu.toFixed(2)} (MRR / paid users)`);

  // 4. Check subscription events for churn
  const { data: cancelEvents } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('event_type', 'subscription_cancelled');

  const churnCount = cancelEvents?.length || 0;
  const churnRate =
    paidUsersCount > 0 ? (churnCount / (paidUsersCount + churnCount)) * 100 : 0;

  console.log(`\nChurn Rate Calculation:`);
  console.log(`- Cancelled subscriptions: ${churnCount}`);
  console.log(`- Formula: (churned / (current paid + churned)) × 100`);
  console.log(`- Expected Churn Rate: ${churnRate.toFixed(2)}%`);

  console.log('\n=== Summary ===');
  console.log(
    'If these values are different from what you see in the UI, there may be an issue with:'
  );
  console.log('1. The API endpoint query');
  console.log('2. The data filtering logic');
  console.log('3. The frontend display logic');

  process.exit(0);
}

checkKPIData().catch(console.error);
