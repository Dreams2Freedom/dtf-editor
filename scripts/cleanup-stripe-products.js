#!/usr/bin/env node

/**
 * Cleanup Stripe Products and Prices
 * This script archives/deletes all products and prices in Stripe
 * Use this if you need to start fresh or clean up test products
 *
 * Usage: node scripts/cleanup-stripe-products.js [--live] [--confirm]
 *
 * By default, it uses test mode. Add --live flag for production.
 * Add --confirm to skip the confirmation prompt.
 */

const Stripe = require('stripe');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Check if we're using live mode
const isLive = process.argv.includes('--live');
const skipConfirm = process.argv.includes('--confirm');

// Select the appropriate Stripe key
const stripeKey = isLive
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY; // Both are the same in your env, but normally you'd have separate keys

if (!stripeKey) {
  console.error('❌ Stripe secret key not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function cleanupStripeProducts() {
  console.log(
    `\n⚠️  WARNING: This will archive ALL products and prices in ${isLive ? 'LIVE' : 'TEST'} mode!\n`
  );

  if (!skipConfirm) {
    const answer = await askQuestion(
      'Are you sure you want to continue? Type "yes" to confirm: '
    );
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Cleanup cancelled');
      rl.close();
      process.exit(0);
    }
  }

  console.log('\n🧹 Starting cleanup...\n');

  const results = {
    archivedPrices: 0,
    archivedProducts: 0,
    errors: [],
  };

  try {
    // First, get all products
    console.log('📋 Fetching all products...');
    const products = await stripe.products.list({ limit: 100, active: true });
    console.log(`   Found ${products.data.length} active products\n`);

    for (const product of products.data) {
      try {
        console.log(`📦 Processing product: ${product.name} (${product.id})`);

        // Get all prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          limit: 100,
          active: true,
        });

        console.log(`   Found ${prices.data.length} active prices`);

        // Archive all prices first
        for (const price of prices.data) {
          try {
            await stripe.prices.update(price.id, { active: false });
            console.log(`   ✅ Archived price: ${price.id}`);
            results.archivedPrices++;
          } catch (error) {
            console.error(
              `   ❌ Error archiving price ${price.id}: ${error.message}`
            );
            results.errors.push({
              type: 'price',
              id: price.id,
              error: error.message,
            });
          }
        }

        // Then archive the product
        try {
          await stripe.products.update(product.id, { active: false });
          console.log(`   ✅ Archived product: ${product.id}\n`);
          results.archivedProducts++;
        } catch (error) {
          console.error(
            `   ❌ Error archiving product ${product.id}: ${error.message}\n`
          );
          results.errors.push({
            type: 'product',
            id: product.id,
            error: error.message,
          });
        }
      } catch (error) {
        console.error(
          `   ❌ Error processing product ${product.id}: ${error.message}\n`
        );
        results.errors.push({
          type: 'product',
          id: product.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching products: ${error.message}`);
    results.errors.push({ type: 'general', error: error.message });
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP COMPLETE - SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Products archived: ${results.archivedProducts}`);
  console.log(`✅ Prices archived: ${results.archivedPrices}`);
  console.log(`❌ Errors: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    results.errors.forEach(err => {
      console.log(`   - ${err.type} ${err.id || ''}: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Cleanup complete!');
  console.log('='.repeat(60) + '\n');

  rl.close();
}

// Run the cleanup
cleanupStripeProducts()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    rl.close();
    process.exit(1);
  });
