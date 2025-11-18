const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkSubscriptions() {
  const customerId = 'cus_TEEgzJ8TbsQT9U';

  console.log('Checking Stripe subscriptions for customer:', customerId);
  console.log('='.repeat(60));

  try {
    // List all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    console.log(`\nTotal subscriptions found: ${subscriptions.data.length}\n`);

    subscriptions.data.forEach((sub, index) => {
      console.log(`\nSubscription #${index + 1}:`);
      console.log('ID:', sub.id);
      console.log('Status:', sub.status);
      console.log('Created:', new Date(sub.created * 1000).toISOString());
      console.log(
        'Current Period Start:',
        new Date(sub.current_period_start * 1000).toISOString()
      );
      console.log(
        'Current Period End:',
        new Date(sub.current_period_end * 1000).toISOString()
      );

      if (sub.canceled_at) {
        console.log(
          'Canceled At:',
          new Date(sub.canceled_at * 1000).toISOString()
        );
      }

      if (sub.cancel_at_period_end) {
        console.log('Cancel At Period End:', sub.cancel_at_period_end);
      }

      console.log('\nItems:');
      sub.items.data.forEach(item => {
        const product = item.price.product;
        console.log(`  - Price ID: ${item.price.id}`);
        console.log(
          `    Product: ${typeof product === 'string' ? product : product.name}`
        );
        console.log(`    Amount: $${item.price.unit_amount / 100}`);
        console.log(`    Interval: ${item.price.recurring.interval}`);
      });

      console.log('\nMetadata:');
      console.log(JSON.stringify(sub.metadata, null, 2));

      console.log('-'.repeat(60));
    });

    // Check for customer details
    console.log('\n' + '='.repeat(60));
    console.log('Customer Details:');
    const customer = await stripe.customers.retrieve(customerId);
    console.log('Email:', customer.email);
    console.log('Name:', customer.name);
    console.log('Created:', new Date(customer.created * 1000).toISOString());
    console.log(
      'Default Payment Method:',
      customer.invoice_settings?.default_payment_method || 'None'
    );
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSubscriptions();
