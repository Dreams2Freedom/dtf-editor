const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorageCleanup() {
  try {
    console.log('🧹 Testing Storage Cleanup System\n');

    // 1. Check for images with expiration dates
    console.log('1. Checking images with expiration dates...');
    const { data: expiringImages, error: checkError } = await supabase
      .from('processed_images')
      .select('id, original_filename, created_at, expires_at, user_id')
      .not('expires_at', 'is', null)
      .order('expires_at', { ascending: true })
      .limit(10);

    if (checkError) {
      console.error('Error checking images:', checkError);
      return;
    }

    console.log(`Found ${expiringImages?.length || 0} images with expiration dates:`);
    expiringImages?.forEach(img => {
      const expiresIn = new Date(img.expires_at) - new Date();
      const hours = Math.floor(expiresIn / (1000 * 60 * 60));
      console.log(`  - ${img.original_filename}: expires in ${hours} hours`);
    });

    // 2. Check for already expired images
    console.log('\n2. Checking for expired images...');
    const { data: expiredImages, error: expiredError } = await supabase
      .from('processed_images')
      .select('id, original_filename, created_at, expires_at')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .limit(10);

    if (expiredError) {
      console.error('Error checking expired images:', expiredError);
      return;
    }

    console.log(`Found ${expiredImages?.length || 0} expired images`);
    expiredImages?.forEach(img => {
      console.log(`  - ${img.original_filename} (expired ${new Date(img.expires_at).toLocaleString()})`);
    });

    // 3. Test cleanup function
    if (expiredImages && expiredImages.length > 0) {
      console.log('\n3. Testing cleanup function...');
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc('cleanup_expired_images');

      if (cleanupError) {
        console.error('Error running cleanup:', cleanupError);
      } else {
        console.log('Cleanup result:', cleanupResult);
      }
    }

    // 4. Check user storage patterns
    console.log('\n4. Checking user storage patterns...');
    const { data: userStats, error: statsError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        subscription_plan,
        subscription_status,
        last_credit_purchase_at,
        processed_images!inner(count)
      `)
      .limit(5);

    if (statsError) {
      console.error('Error getting user stats:', statsError);
      return;
    }

    console.log('User storage summary:');
    userStats?.forEach(user => {
      const imageCount = user.processed_images?.[0]?.count || 0;
      console.log(`  - User ${user.user_id.substring(0, 8)}...`);
      console.log(`    Plan: ${user.subscription_plan || 'free'}`);
      console.log(`    Status: ${user.subscription_status || 'inactive'}`);
      console.log(`    Images: ${imageCount}`);
    });

    // 5. Test expiration calculation
    console.log('\n5. Testing expiration calculation...');
    
    // Get a test user
    const { data: testUser } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('subscription_plan', 'free')
      .limit(1)
      .single();

    if (testUser) {
      const { data: expirationTest, error: expError } = await supabase
        .rpc('calculate_image_expiration', {
          p_user_id: testUser.user_id,
          p_created_at: new Date().toISOString()
        });

      if (expError) {
        console.error('Error calculating expiration:', expError);
      } else {
        console.log(`Free user image would expire at: ${expirationTest}`);
      }
    }

    console.log('\n✅ Storage cleanup system test complete!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStorageCleanup();