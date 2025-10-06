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
    .order('created_at', { ascending: false })
    .limit(20);

  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`Total users fetched: ${users.length}`);

    // Count by subscription status
    const paidUsers = users.filter(
      u =>
        u.subscription_status === 'active' ||
        u.subscription_status === 'trialing'
    );
    const freeUsers = users.filter(
      u => !u.subscription_plan || u.subscription_plan === 'free'
    );

    console.log(`- Paid users: ${paidUsers.length}`);
    console.log(`- Free users: ${freeUsers.length}`);
    console.log(
      `- Users with subscription_status 'active': ${users.filter(u => u.subscription_status === 'active').length}`
    );
    console.log(
      `- Users with subscription_status 'trialing': ${users.filter(u => u.subscription_status === 'trialing').length}`
    );

    console.log('\nSample user data:');
    users.slice(0, 5).forEach((user, i) => {
      console.log(`User ${i + 1}:`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Plan: ${user.subscription_plan || 'null'}`);
      console.log(`  - Status: ${user.subscription_status || 'null'}`);
      console.log(`  - Created: ${user.created_at}`);
      console.log(`  - Last Activity: ${user.last_activity_at || 'null'}`);
    });
  }

  // 2. Check credit transactions
  const { data: transactions, error: transError } = await supabase
    .from('credit_transactions')
    .select('amount, metadata, type, created_at, user_id')
    .in('type', ['purchase', 'subscription'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (transError) {
    console.error('\nError fetching transactions:', transError);
  } else {
    console.log(`\n=== Credit Transactions ===`);
    console.log(`Total transactions fetched: ${transactions.length}`);

    if (transactions.length > 0) {
      console.log('\nSample transactions:');
      transactions.slice(0, 3).forEach((t, i) => {
        console.log(`Transaction ${i + 1}:`);
        console.log(`  - Type: ${t.type}`);
        console.log(`  - Amount: ${t.amount} credits`);
        console.log(
          `  - Price paid: $${t.metadata?.price_paid ? (t.metadata.price_paid / 100).toFixed(2) : 'N/A'}`
        );
        console.log(`  - Created: ${t.created_at}`);
      });

      // Calculate revenue
      const revenue = transactions.reduce((sum, t) => {
        const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
        return sum + price / 100;
      }, 0);
      console.log(
        `\nTotal revenue from fetched transactions: $${revenue.toFixed(2)}`
      );
    }
  }

  // 3. Check subscription events
  const { data: subEvents, error: subError } = await supabase
    .from('subscription_events')
    .select('user_id, event_type, created_at, event_data')
    .order('created_at', { ascending: false })
    .limit(10);

  if (subError) {
    console.error('\nError fetching subscription events:', subError);
  } else {
    console.log(`\n=== Subscription Events ===`);
    console.log(`Total events fetched: ${subEvents.length}`);

    if (subEvents.length > 0) {
      const eventTypes = {};
      subEvents.forEach(e => {
        eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
      });

      console.log('\nEvent types:');
      Object.entries(eventTypes).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

      console.log('\nSample events:');
      subEvents.slice(0, 3).forEach((e, i) => {
        console.log(`Event ${i + 1}:`);
        console.log(`  - Type: ${e.event_type}`);
        console.log(`  - Created: ${e.created_at}`);
        console.log(
          `  - Data: ${JSON.stringify(e.event_data).substring(0, 100)}...`
        );
      });
    }
  }

  // 4. Check if there's any data that would result in non-zero metrics
  console.log('\n=== Metric Calculation Check ===');

  const totalUsers = users?.length || 0;
  const paidUsersCount =
    users?.filter(
      u =>
        u.subscription_status === 'active' ||
        u.subscription_status === 'trialing'
    ).length || 0;
  const freeUsersCount =
    users?.filter(u => !u.subscription_plan || u.subscription_plan === 'free')
      .length || 0;

  console.log(`\nFor conversion rate calculation:`);
  console.log(`- Total users: ${totalUsers}`);
  console.log(`- Paid users: ${paidUsersCount}`);
  console.log(`- Free users: ${freeUsersCount}`);
  console.log(
    `- Conversion rate would be: ${totalUsers > 0 ? ((paidUsersCount / totalUsers) * 100).toFixed(2) : 0}%`
  );

  // Check for ARPU
  const basicCount =
    users?.filter(u => u.subscription_plan === 'basic').length || 0;
  const starterCount =
    users?.filter(u => u.subscription_plan === 'starter').length || 0;
  const proCount =
    users?.filter(
      u =>
        u.subscription_plan === 'professional' || u.subscription_plan === 'pro'
    ).length || 0;

  const mrr = basicCount * 9.99 + starterCount * 24.99 + proCount * 49.99;
  const arpu = paidUsersCount > 0 ? mrr / paidUsersCount : 0;

  console.log(`\nFor ARPU calculation:`);
  console.log(`- Basic subscribers: ${basicCount}`);
  console.log(`- Starter subscribers: ${starterCount}`);
  console.log(`- Pro subscribers: ${proCount}`);
  console.log(`- MRR: $${mrr.toFixed(2)}`);
  console.log(`- ARPU would be: $${arpu.toFixed(2)}`);

  process.exit(0);
}

checkKPIData().catch(console.error);
