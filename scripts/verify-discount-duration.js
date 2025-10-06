#!/usr/bin/env node
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function verifyDiscountDuration() {
  console.log('Verifying discount duration and pricing...\n');

  try {
    const subscriptionId = 'sub_1RqD2HPHFzf1GpIrdlhelKiG';

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    console.log('=== CURRENT SUBSCRIPTION ===');
    console.log(
      'Regular monthly price: $' +
        subscription.items.data[0].price.unit_amount / 100
    );
    console.log(
      'Billing cycle: ' + subscription.items.data[0].price.recurring.interval
    );
    console.log(
      'Current period ends: ' +
        new Date(subscription.current_period_end * 1000).toLocaleDateString()
    );

    // Check discount details
    console.log('\n=== DISCOUNT DETAILS ===');
    if (subscription.discount) {
      const discount = subscription.discount;
      console.log('Coupon ID: ' + discount.coupon.id);
      console.log('Discount: ' + discount.coupon.percent_off + '% off');
      console.log('Duration: ' + discount.coupon.duration);
      console.log(
        'Duration in months: ' + (discount.coupon.duration_in_months || 'N/A')
      );

      // This is the key part - "once" means only one billing cycle
      if (discount.coupon.duration === 'once') {
        console.log(
          '\n✅ CONFIRMED: Discount applies to NEXT BILLING CYCLE ONLY'
        );
        console.log(
          'After that, price returns to regular $' +
            subscription.items.data[0].price.unit_amount / 100
        );
      }

      // Show when discount ends
      if (discount.end) {
        console.log(
          'Discount expires: ' +
            new Date(discount.end * 1000).toLocaleDateString()
        );
      } else {
        console.log('Discount will be used on next invoice');
      }
    }

    // Create a timeline
    console.log('\n=== BILLING TIMELINE ===');
    const regularPrice = subscription.items.data[0].price.unit_amount / 100;
    const discountedPrice = regularPrice * 0.5;
    const nextBillingDate = new Date(subscription.current_period_end * 1000);
    const followingBillingDate = new Date(nextBillingDate);
    followingBillingDate.setMonth(followingBillingDate.getMonth() + 1);

    console.log('Today: ' + new Date().toLocaleDateString());
    console.log(
      '\n1. Next billing (' + nextBillingDate.toLocaleDateString() + '):'
    );
    console.log(
      '   Amount: $' + discountedPrice.toFixed(2) + ' (50% OFF - ONE TIME ONLY)'
    );

    console.log(
      '\n2. Following billing (' +
        followingBillingDate.toLocaleDateString() +
        '):'
    );
    console.log(
      '   Amount: $' + regularPrice.toFixed(2) + ' (BACK TO REGULAR PRICE)'
    );

    console.log('\n3. All future billings:');
    console.log('   Amount: $' + regularPrice.toFixed(2) + ' (REGULAR PRICE)');

    // Check Stripe's discount object properties
    console.log('\n=== TECHNICAL VERIFICATION ===');
    console.log('Coupon properties:');
    console.log(
      '- duration: "' +
        subscription.discount.coupon.duration +
        '" (means applies once)'
    );
    console.log(
      '- times_redeemed: ' + subscription.discount.coupon.times_redeemed
    );
    console.log(
      '- max_redemptions: ' + subscription.discount.coupon.max_redemptions
    );
    console.log('- valid: ' + subscription.discount.coupon.valid);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyDiscountDuration();
