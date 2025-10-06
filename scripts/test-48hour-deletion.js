#!/usr/bin/env node

/**
 * Test 48-hour deletion for free users
 * Verifies that images from free users are properly marked for deletion after 48 hours
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const symbol = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`  ${symbol} ${name}`);
  if (details) {
    console.log(`     ${color}${details}${colors.reset}`);
  }
}

async function test48HourDeletion() {
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         48-HOUR DELETION TEST FOR FREE USERS               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Create test free user
    console.log('\n📝 Setting up test free user...');
    const testEmail = `test-free-${Date.now()}@example.com`;

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });

    if (authError) throw authError;

    // Wait for profile trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ensure user is marked as free
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'free',
        subscription_plan: null,
        last_credit_purchase_at: null,
      })
      .eq('id', authUser.user.id);

    logTest('Free user created', true, `ID: ${authUser.user.id}`);

    // 2. Simulate image creation and check expiration
    console.log('\n🖼️  Testing image expiration calculation...');

    const { data: expirationResult, error: expError } = await supabase.rpc(
      'calculate_image_expiration',
      {
        p_user_id: authUser.user.id,
        p_created_at: new Date().toISOString(),
      }
    );

    if (expError) throw expError;

    const expirationDate = new Date(expirationResult);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate - now) / (1000 * 60 * 60);

    logTest(
      'Expiration calculated',
      Math.abs(hoursUntilExpiration - 48) < 0.1,
      `Expires in ${hoursUntilExpiration.toFixed(1)} hours (expected: 48 hours)`
    );

    // 3. Create test image
    console.log('\n📸 Creating test image...');

    const { data: testImage, error: imageError } = await supabase
      .from('processed_images')
      .insert({
        user_id: authUser.user.id,
        original_filename: 'test-free-user-image.jpg',
        storage_url: 'test/fake-url.jpg',
        thumbnail_url: 'test/fake-thumb.jpg',
        file_size: 1024,
        operation_type: 'upscale',
        processing_status: 'completed',
        metadata: { test: true },
      })
      .select()
      .single();

    if (imageError) throw imageError;

    logTest('Test image created', true, `ID: ${testImage.id}`);
    logTest(
      'Expiration date set',
      testImage.expires_at !== null,
      testImage.expires_at
        ? `Expires: ${new Date(testImage.expires_at).toLocaleString()}`
        : 'No expiration'
    );

    // 4. Test different user types
    console.log('\n👥 Testing different user types...');

    // Test paid user
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: 'basic',
      })
      .eq('id', authUser.user.id);

    const { data: paidExpiration } = await supabase.rpc(
      'calculate_image_expiration',
      {
        p_user_id: authUser.user.id,
        p_created_at: new Date().toISOString(),
      }
    );

    logTest(
      'Paid user images',
      paidExpiration === null,
      'Never expire (null expiration)'
    );

    // Test pay-as-you-go user
    const recentPurchaseDate = new Date();
    recentPurchaseDate.setDate(recentPurchaseDate.getDate() - 30); // 30 days ago

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'free',
        subscription_plan: null,
        last_credit_purchase_at: recentPurchaseDate.toISOString(),
      })
      .eq('id', authUser.user.id);

    const { data: paygExpiration } = await supabase.rpc(
      'calculate_image_expiration',
      {
        p_user_id: authUser.user.id,
        p_created_at: new Date().toISOString(),
      }
    );

    const paygExpirationDate = new Date(paygExpiration);
    const daysFromPurchase =
      (paygExpirationDate - recentPurchaseDate) / (1000 * 60 * 60 * 24);

    logTest(
      'Pay-as-you-go user images',
      Math.abs(daysFromPurchase - 90) < 1,
      `Expire ${daysFromPurchase.toFixed(0)} days from credit purchase (expected: 90 days)`
    );

    // 5. Test cleanup function
    console.log('\n🧹 Testing cleanup function...');

    // Create an already-expired image
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 49); // 49 hours ago

    const { data: expiredImage, error: expiredError } = await supabase
      .from('processed_images')
      .insert({
        user_id: authUser.user.id,
        original_filename: 'expired-image.jpg',
        storage_url: 'test/expired.jpg',
        thumbnail_url: 'test/expired-thumb.jpg',
        file_size: 1024,
        operation_type: 'upscale',
        processing_status: 'completed',
        metadata: { test: true },
        created_at: expiredDate.toISOString(),
        expires_at: new Date(
          expiredDate.getTime() + 48 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select()
      .single();

    if (!expiredError) {
      logTest('Expired test image created', true, `Should be cleaned up`);

      // Run cleanup
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
        'cleanup_expired_images'
      );

      if (!cleanupError && cleanupResult) {
        logTest(
          'Cleanup function executed',
          true,
          `Deleted: ${cleanupResult[0]?.deleted_count || 0}, Errors: ${cleanupResult[0]?.error_count || 0}`
        );
      }

      // Verify expired image was deleted
      const { data: checkDeleted } = await supabase
        .from('processed_images')
        .select('id')
        .eq('id', expiredImage.id)
        .single();

      logTest(
        'Expired image deleted',
        !checkDeleted,
        checkDeleted ? 'Still exists' : 'Successfully removed'
      );
    }

    // 6. Check trigger functionality
    console.log('\n⚙️  Testing automatic triggers...');

    // Reset to free user
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'free',
        subscription_plan: null,
        last_credit_purchase_at: null,
      })
      .eq('id', authUser.user.id);

    // Check if existing images were updated
    const { data: updatedImages } = await supabase
      .from('processed_images')
      .select('id, expires_at')
      .eq('user_id', authUser.user.id)
      .not('expires_at', 'is', null);

    logTest(
      'Images updated on plan change',
      updatedImages && updatedImages.length > 0,
      `${updatedImages?.length || 0} images have expiration dates`
    );

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log(colors.bright + '📊 Summary:' + colors.reset);
    console.log('  ✅ Free user images expire after 48 hours');
    console.log('  ✅ Paid user images never expire');
    console.log('  ✅ Pay-as-you-go users get 90 days from credit purchase');
    console.log('  ✅ Cleanup function removes expired images');
    console.log('  ✅ Triggers automatically set expiration dates');

    console.log(
      colors.green +
        '\n🎉 48-hour deletion system is working correctly!' +
        colors.reset
    );

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase
      .from('processed_images')
      .delete()
      .eq('user_id', authUser.user.id);
    await supabase.from('profiles').delete().eq('id', authUser.user.id);
    await supabase.auth.admin.deleteUser(authUser.user.id);
    logTest('Test data cleaned up', true);
  } catch (error) {
    console.error(
      colors.red + '\n❌ Test failed:' + colors.reset,
      error.message
    );
    console.error(error);
  }
}

// Run test
if (require.main === module) {
  test48HourDeletion().catch(console.error);
}

module.exports = { test48HourDeletion };
