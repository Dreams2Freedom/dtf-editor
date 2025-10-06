const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupProducts() {
  console.log('🚀 Setting up Stripe products and prices in LIVE mode...\n');

  const products = [
    // Credit Packs (One-time purchases)
    {
      name: '5 Credits Pack',
      description: 'One-time purchase of 5 processing credits',
      metadata: { type: 'credits', amount: '5' },
      prices: [
        {
          unit_amount: 249, // $2.49
          currency: 'usd',
          nickname: '5 Credits - One Time',
        },
      ],
    },
    {
      name: '10 Credits Pack',
      description: 'One-time purchase of 10 processing credits',
      metadata: { type: 'credits', amount: '10' },
      prices: [
        {
          unit_amount: 449, // $4.49
          currency: 'usd',
          nickname: '10 Credits - One Time',
        },
      ],
    },
    {
      name: '20 Credits Pack',
      description: 'One-time purchase of 20 processing credits',
      metadata: { type: 'credits', amount: '20' },
      prices: [
        {
          unit_amount: 799, // $7.99
          currency: 'usd',
          nickname: '20 Credits - One Time',
        },
      ],
    },

    // Subscription Plans
    {
      name: 'Basic Plan',
      description: '20 credits per month with unlimited storage',
      metadata: { type: 'subscription', tier: 'basic', credits: '20' },
      prices: [
        {
          unit_amount: 499, // $4.99/month
          currency: 'usd',
          recurring: { interval: 'month' },
          nickname: 'Basic Monthly Subscription',
        },
      ],
    },
    {
      name: 'Starter Plan',
      description:
        '60 credits per month with unlimited storage and priority support',
      metadata: { type: 'subscription', tier: 'starter', credits: '60' },
      prices: [
        {
          unit_amount: 1499, // $14.99/month
          currency: 'usd',
          recurring: { interval: 'month' },
          nickname: 'Starter Monthly Subscription',
        },
      ],
    },
  ];

  const createdProducts = {};

  for (const productData of products) {
    try {
      console.log(`📦 Creating product: ${productData.name}`);

      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `name:"${productData.name}"`,
      });

      let product;
      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0];
        console.log(`   ⚠️  Product already exists with ID: ${product.id}`);
      } else {
        // Create the product
        product = await stripe.products.create({
          name: productData.name,
          description: productData.description,
          metadata: productData.metadata,
          active: true,
        });
        console.log(`   ✅ Product created with ID: ${product.id}`);
      }

      // Create prices for the product
      for (const priceData of productData.prices) {
        // Check if price already exists
        const existingPrices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        const priceExists = existingPrices.data.some(
          p =>
            p.unit_amount === priceData.unit_amount &&
            p.currency === priceData.currency &&
            p.recurring?.interval === priceData.recurring?.interval
        );

        if (priceExists) {
          const existingPrice = existingPrices.data.find(
            p =>
              p.unit_amount === priceData.unit_amount &&
              p.currency === priceData.currency &&
              p.recurring?.interval === priceData.recurring?.interval
          );
          console.log(`   💰 Price already exists: ${priceData.nickname}`);
          console.log(`      ID: ${existingPrice.id}`);
          createdProducts[productData.name] = {
            product_id: product.id,
            price_id: existingPrice.id,
          };
        } else {
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: priceData.unit_amount,
            currency: priceData.currency,
            nickname: priceData.nickname,
            recurring: priceData.recurring,
            active: true,
          });
          console.log(`   💰 Price created: ${priceData.nickname}`);
          console.log(`      ID: ${price.id}`);
          createdProducts[productData.name] = {
            product_id: product.id,
            price_id: price.id,
          };
        }
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Error creating ${productData.name}:`, error.message);
    }
  }

  // Display summary with price IDs to use in code
  console.log('\n' + '='.repeat(60));
  console.log('📋 PRICE IDs TO USE IN YOUR APPLICATION:');
  console.log('='.repeat(60));
  console.log('\n// Add these to your environment variables or config:\n');

  console.log('// One-time credit packs:');
  if (createdProducts['5 Credits Pack']) {
    console.log(
      `STRIPE_PRICE_5_CREDITS="${createdProducts['5 Credits Pack'].price_id}"`
    );
  }
  if (createdProducts['10 Credits Pack']) {
    console.log(
      `STRIPE_PRICE_10_CREDITS="${createdProducts['10 Credits Pack'].price_id}"`
    );
  }
  if (createdProducts['20 Credits Pack']) {
    console.log(
      `STRIPE_PRICE_20_CREDITS="${createdProducts['20 Credits Pack'].price_id}"`
    );
  }

  console.log('\n// Subscription plans:');
  if (createdProducts['Basic Plan']) {
    console.log(
      `STRIPE_PRICE_BASIC_MONTHLY="${createdProducts['Basic Plan'].price_id}"`
    );
  }
  if (createdProducts['Starter Plan']) {
    console.log(
      `STRIPE_PRICE_STARTER_MONTHLY="${createdProducts['Starter Plan'].price_id}"`
    );
  }

  console.log('\n✅ Setup complete! Your products are ready in LIVE mode.');
  console.log(
    '\n⚠️  IMPORTANT: Update your application with the price IDs above'
  );
}

// Run the setup
setupProducts().catch(console.error);
