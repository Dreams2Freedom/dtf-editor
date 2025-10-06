#!/usr/bin/env node

/**
 * Setup Stripe Products and Prices
 * This script creates all the products and prices in Stripe based on our pricing structure
 *
 * Usage: node scripts/setup-stripe-products.js [--live]
 *
 * By default, it uses test mode. Add --live flag to create in production.
 */

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

// Check if we're using live mode
const isLive = process.argv.includes('--live');

// Select the appropriate Stripe key
const stripeKey = isLive
  ? process.env.STRIPE_LIVE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error('❌ Stripe secret key not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

// Define our products and pricing structure
const products = [
  {
    id: 'basic_subscription',
    name: 'Basic',
    description: 'Perfect for individuals and small projects',
    metadata: {
      credits_per_month: '20',
      plan_type: 'subscription',
      plan_id: 'basic',
    },
    prices: [
      {
        unit_amount: 999, // $9.99 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        nickname: 'Basic Monthly',
        metadata: {
          credits: '20',
        },
      },
    ],
  },
  {
    id: 'starter_subscription',
    name: 'Starter',
    description: 'Great for growing businesses and regular users',
    metadata: {
      credits_per_month: '60',
      plan_type: 'subscription',
      plan_id: 'starter',
    },
    prices: [
      {
        unit_amount: 2499, // $24.99 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        nickname: 'Starter Monthly',
        metadata: {
          credits: '60',
        },
      },
    ],
  },
  {
    id: 'professional_subscription',
    name: 'Professional',
    description: 'Best value for power users and businesses',
    metadata: {
      credits_per_month: '150',
      plan_type: 'subscription',
      plan_id: 'professional',
    },
    prices: [
      {
        unit_amount: 4999, // $49.99 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        nickname: 'Professional Monthly',
        metadata: {
          credits: '150',
        },
      },
    ],
  },
  {
    id: 'payg_10_credits',
    name: '10 Credits Package',
    description: 'Pay as you go - 10 credits',
    metadata: {
      credits: '10',
      plan_type: 'payg',
      package_id: 'payg-10',
    },
    prices: [
      {
        unit_amount: 799, // $7.99 in cents
        currency: 'usd',
        nickname: '10 Credits',
        metadata: {
          credits: '10',
          type: 'one_time',
        },
      },
    ],
  },
  {
    id: 'payg_20_credits',
    name: '20 Credits Package',
    description: 'Pay as you go - 20 credits',
    metadata: {
      credits: '20',
      plan_type: 'payg',
      package_id: 'payg-20',
    },
    prices: [
      {
        unit_amount: 1499, // $14.99 in cents
        currency: 'usd',
        nickname: '20 Credits',
        metadata: {
          credits: '20',
          type: 'one_time',
        },
      },
    ],
  },
  {
    id: 'payg_50_credits',
    name: '50 Credits Package',
    description: 'Pay as you go - 50 credits (Best value)',
    metadata: {
      credits: '50',
      plan_type: 'payg',
      package_id: 'payg-50',
    },
    prices: [
      {
        unit_amount: 2999, // $29.99 in cents
        currency: 'usd',
        nickname: '50 Credits',
        metadata: {
          credits: '50',
          type: 'one_time',
        },
      },
    ],
  },
];

async function setupStripeProducts() {
  console.log(
    `\n🚀 Setting up Stripe products in ${isLive ? 'LIVE' : 'TEST'} mode...\n`
  );

  const results = {
    products: [],
    prices: [],
    errors: [],
  };

  for (const productData of products) {
    try {
      console.log(`📦 Creating product: ${productData.name}...`);

      // Create the product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: productData.metadata,
        active: true,
        tax_code: 'txcd_10103000', // SaaS - Business Use tax code
        statement_descriptor: 'DTF EDITOR',
      });

      console.log(`   ✅ Product created: ${product.id}`);
      results.products.push(product);

      // Create prices for this product
      for (const priceData of productData.prices) {
        console.log(`   💰 Creating price: ${priceData.nickname}...`);

        const priceConfig = {
          product: product.id,
          unit_amount: priceData.unit_amount,
          currency: priceData.currency,
          nickname: priceData.nickname,
          metadata: priceData.metadata,
        };

        // Add recurring config for subscriptions
        if (priceData.recurring) {
          priceConfig.recurring = priceData.recurring;
        }

        const price = await stripe.prices.create(priceConfig);
        console.log(
          `   ✅ Price created: ${price.id} ($${(price.unit_amount / 100).toFixed(2)})`
        );
        results.prices.push(price);
      }

      console.log('');
    } catch (error) {
      console.error(
        `   ❌ Error creating ${productData.name}: ${error.message}`
      );
      results.errors.push({ product: productData.name, error: error.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SETUP COMPLETE - SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Products created: ${results.products.length}`);
  console.log(`✅ Prices created: ${results.prices.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    results.errors.forEach(err => {
      console.log(`   - ${err.product}: ${err.error}`);
    });
  }

  // Print environment variable configuration
  console.log('\n' + '='.repeat(60));
  console.log('🔧 UPDATE YOUR .env.local WITH THESE PRICE IDs:');
  console.log('='.repeat(60));
  console.log('\n# Subscription Plan Price IDs');

  // Find and print subscription price IDs
  for (const product of results.products) {
    if (product.metadata.plan_type === 'subscription') {
      const price = results.prices.find(
        p => p.product === product.id && p.recurring?.interval === 'month'
      );
      if (price) {
        const envKey = `STRIPE_${product.metadata.plan_id.toUpperCase()}_PLAN_PRICE_ID`;
        console.log(`${envKey}=${price.id}`);
      }
    }
  }

  console.log('\n# Pay-as-You-Go Package Price IDs');

  // Find and print PAYG price IDs
  for (const product of results.products) {
    if (product.metadata.plan_type === 'payg') {
      const price = results.prices.find(p => p.product === product.id);
      if (price) {
        const credits = product.metadata.credits;
        const envKey = `STRIPE_PAYG_${credits}_CREDITS_PRICE_ID`;
        console.log(`${envKey}=${price.id}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    '✨ Setup complete! Copy the price IDs above to your .env.local file'
  );
  console.log('='.repeat(60) + '\n');
}

// Run the setup
setupStripeProducts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
