const stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

async function checkSubscription() {
  try {
    // List all subscriptions for the customer
    const subscriptions = await stripeClient.subscriptions.list({
      customer: 'cus_SljqE25ffokLaJ',
      limit: 10
    });

    console.log(`Found ${subscriptions.data.length} subscriptions:`);
    
    subscriptions.data.forEach((sub, index) => {
      console.log(`\nSubscription ${index + 1}:`);
      console.log('ID:', sub.id);
      console.log('Status:', sub.status);
      console.log('Price ID:', sub.items.data[0]?.price.id);
      console.log('Product ID:', sub.items.data[0]?.price.product);
      console.log('Amount:', sub.items.data[0]?.price.unit_amount / 100);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSubscription();