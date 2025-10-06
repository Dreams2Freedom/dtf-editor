const stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLatestPayment() {
  try {
    // Get the most recent payment intent
    const paymentIntents = await stripeClient.paymentIntents.list({
      limit: 1,
      customer: 'cus_SljqE25ffokLaJ',
    });

    const latest = paymentIntents.data[0];
    console.log('Latest Payment Intent:');
    console.log('ID:', latest.id);
    console.log('Amount:', latest.amount / 100);
    console.log('Status:', latest.status);
    console.log('Created:', new Date(latest.created * 1000).toLocaleString());
    console.log('Metadata:', latest.metadata);

    // Check if credits were added
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', 'f689bb22-89dd-4c3c-a941-d77feb84428d')
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('\nRecent transactions:');
    transactions?.forEach(t => {
      console.log(
        `- ${t.created_at}: ${t.amount} credits (${t.type}) - ${t.description}`
      );
    });

    // Check for any errors in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    console.log('\nChecking for recent errors...');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLatestPayment();
