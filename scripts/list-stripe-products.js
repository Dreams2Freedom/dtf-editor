#!/usr/bin/env node

/**
 * List Stripe Products and Prices
 * This script lists all products and their prices in your Stripe account
 *
 * Usage: node scripts/list-stripe-products.js [--live]
 *
 * By default, it uses test mode. Add --live flag to check production.
 */

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

// Check if we're using live mode
const isLive = process.argv.includes('--live');

// Select the appropriate Stripe key
const stripeKey = isLive
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY; // Both are the same in your env, but normally you'd have separate keys

if (!stripeKey) {
  console.error('❌ Stripe secret key not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

async function listStripeProducts() {
  console.log(
    `\n📋 Listing Stripe products in ${isLive ? 'LIVE' : 'TEST'} mode...\n`
  );
  console.log('='.repeat(80));

  try {
    // Fetch all products (including inactive)
    const products = await stripe.products.list({
      limit: 100,
      active: undefined, // Get both active and inactive
    });

    console.log(`Found ${products.data.length} total products\n`);

    for (const product of products.data) {
      const status = product.active ? '✅ ACTIVE' : '❌ INACTIVE';
      console.log(`${status} | ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Description: ${product.description || 'N/A'}`);

      if (product.metadata && Object.keys(product.metadata).length > 0) {
        console.log(`   Metadata:`);
        Object.entries(product.metadata).forEach(([key, value]) => {
          console.log(`      - ${key}: ${value}`);
        });
      }

      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
        active: undefined, // Get both active and inactive
      });

      if (prices.data.length > 0) {
        console.log(`   Prices (${prices.data.length}):`);
        for (const price of prices.data) {
          const priceStatus = price.active ? '✅' : '❌';
          const amount = `$${(price.unit_amount / 100).toFixed(2)}`;
          const recurring = price.recurring
            ? ` / ${price.recurring.interval}`
            : ' (one-time)';

          console.log(`      ${priceStatus} ${price.id}`);
          console.log(
            `         ${price.nickname || 'Unnamed'}: ${amount}${recurring}`
          );

          if (price.metadata && Object.keys(price.metadata).length > 0) {
            console.log(`         Metadata:`);
            Object.entries(price.metadata).forEach(([key, value]) => {
              console.log(`            - ${key}: ${value}`);
            });
          }
        }
      } else {
        console.log(`   No prices found`);
      }

      console.log('   ' + '-'.repeat(76));
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));

    const activeProducts = products.data.filter(p => p.active).length;
    const inactiveProducts = products.data.filter(p => !p.active).length;

    console.log(`Total Products: ${products.data.length}`);
    console.log(`   Active: ${activeProducts}`);
    console.log(`   Inactive: ${inactiveProducts}`);

    // Count total prices
    let totalPrices = 0;
    let activePrices = 0;
    for (const product of products.data) {
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
        active: undefined,
      });
      totalPrices += prices.data.length;
      activePrices += prices.data.filter(p => p.active).length;
    }

    console.log(`\nTotal Prices: ${totalPrices}`);
    console.log(`   Active: ${activePrices}`);
    console.log(`   Inactive: ${totalPrices - activePrices}`);

    console.log('\n' + '='.repeat(80) + '\n');
  } catch (error) {
    console.error(`❌ Error fetching products: ${error.message}`);
    process.exit(1);
  }
}

// Run the listing
listStripeProducts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
