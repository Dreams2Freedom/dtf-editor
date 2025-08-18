const Stripe = require('stripe');
require('dotenv').config();

// You'll need to temporarily add your test key here
const TEST_STRIPE_KEY = 'sk_test_...'; // ADD YOUR TEST KEY HERE
const LIVE_STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!LIVE_STRIPE_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY in environment variables');
  process.exit(1);
}

if (TEST_STRIPE_KEY === 'sk_test_...') {
  console.error('❌ Please add your Stripe test key to this script');
  console.error('   You can find it at: https://dashboard.stripe.com/test/apikeys');
  process.exit(1);
}

const stripeTest = new Stripe(TEST_STRIPE_KEY);
const stripeLive = new Stripe(LIVE_STRIPE_KEY);

async function migrateProducts() {
  console.log('🔄 Migrating Stripe products from test to live mode...\n');

  try {
    // Step 1: Fetch all products from test mode
    console.log('📦 Fetching test mode products...');
    const testProducts = await stripeTest.products.list({ limit: 100, active: true });
    
    console.log(`Found ${testProducts.data.length} products in test mode\n`);

    // Step 2: Migrate each product
    for (const testProduct of testProducts.data) {
      console.log(`\n📋 Migrating product: ${testProduct.name}`);
      console.log(`   Description: ${testProduct.description || 'N/A'}`);
      
      // Create product in live mode
      let liveProduct;
      try {
        // Check if product already exists (by name)
        const existingProducts = await stripeLive.products.search({
          query: `name:"${testProduct.name}"`
        });

        if (existingProducts.data.length > 0) {
          console.log(`   ⚠️  Product already exists in live mode, using existing`);
          liveProduct = existingProducts.data[0];
        } else {
          liveProduct = await stripeLive.products.create({
            name: testProduct.name,
            description: testProduct.description,
            metadata: testProduct.metadata,
            tax_code: testProduct.tax_code,
            active: testProduct.active
          });
          console.log(`   ✅ Product created with ID: ${liveProduct.id}`);
        }

        // Step 3: Fetch and migrate prices for this product
        const testPrices = await stripeTest.prices.list({ 
          product: testProduct.id,
          limit: 100,
          active: true
        });

        console.log(`   💰 Found ${testPrices.data.length} price(s) for this product`);

        for (const testPrice of testPrices.data) {
          // Check if price already exists
          const existingPrices = await stripeLive.prices.list({
            product: liveProduct.id,
            active: true
          });

          const priceExists = existingPrices.data.some(p => 
            p.unit_amount === testPrice.unit_amount &&
            p.currency === testPrice.currency &&
            p.recurring?.interval === testPrice.recurring?.interval
          );

          if (priceExists) {
            console.log(`      ⚠️  Price already exists: ${formatPrice(testPrice)}`);
            continue;
          }

          // Create price in live mode
          const priceData = {
            product: liveProduct.id,
            currency: testPrice.currency,
            metadata: testPrice.metadata,
            nickname: testPrice.nickname,
            active: testPrice.active
          };

          if (testPrice.recurring) {
            priceData.recurring = {
              interval: testPrice.recurring.interval,
              interval_count: testPrice.recurring.interval_count
            };
            priceData.unit_amount = testPrice.unit_amount;
          } else {
            priceData.unit_amount = testPrice.unit_amount;
          }

          const livePrice = await stripeLive.prices.create(priceData);
          console.log(`      ✅ Price created: ${formatPrice(testPrice)} - ID: ${livePrice.id}`);
        }

      } catch (error) {
        console.error(`   ❌ Error migrating product: ${error.message}`);
      }
    }

    // Step 4: List all created products and prices
    console.log('\n\n📊 Migration Summary:');
    console.log('=' .repeat(50));
    
    const liveProducts = await stripeLive.products.list({ limit: 100, active: true });
    
    for (const product of liveProducts.data) {
      console.log(`\n📦 ${product.name}`);
      console.log(`   Product ID: ${product.id}`);
      
      const prices = await stripeLive.prices.list({ 
        product: product.id,
        active: true 
      });
      
      if (prices.data.length > 0) {
        console.log('   Prices:');
        for (const price of prices.data) {
          console.log(`     - ${formatPrice(price)} (ID: ${price.id})`);
        }
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\n⚠️  IMPORTANT: Update your code with the new live mode price IDs');
    console.log('   The price IDs above need to be used in your application code');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

function formatPrice(price) {
  const amount = (price.unit_amount / 100).toFixed(2);
  const currency = price.currency.toUpperCase();
  
  if (price.recurring) {
    return `${currency} ${amount}/${price.recurring.interval}`;
  } else {
    return `${currency} ${amount} (one-time)`;
  }
}

// Run the migration
migrateProducts();