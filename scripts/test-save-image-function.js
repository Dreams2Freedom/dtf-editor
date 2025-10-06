#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSaveImage() {
  console.log('🔍 Testing image save function...\n');

  const shannonId = '1596097b-8333-452a-a2bd-ea27340677ec'; // shannon@s2transfers.com

  try {
    // Test saving an image
    console.log('1️⃣ Testing insert_processed_image for Shannon...');

    const { data: imageId, error: insertError } = await supabase.rpc(
      'insert_processed_image',
      {
        p_user_id: shannonId,
        p_original_filename: 'test-background-removal.jpg',
        p_processed_filename: 'test-background-removal_nobg.png',
        p_operation_type: 'background-removal',
        p_file_size: 1536000,
        p_processing_status: 'completed',
        p_storage_url: 'https://example.com/test-bg-removed.png',
        p_metadata: {
          credits_used: 1,
          processing_time_ms: 2500,
          api_used: 'ClippingMagic',
        },
      }
    );

    if (insertError) {
      console.log('❌ Insert failed:', insertError);
      console.log('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ Insert successful!');
      console.log('   Image ID:', imageId);

      // Now check if we can retrieve it
      console.log('\n2️⃣ Verifying image was saved...');
      const { data: images, error: getError } = await supabase.rpc(
        'get_user_images',
        {
          p_user_id: shannonId,
        }
      );

      if (getError) {
        console.log('❌ Get failed:', getError);
      } else {
        console.log('✅ Found', images.length, 'images');
        const testImage = images.find(img => img.id === imageId);
        if (testImage) {
          console.log('   Test image found!');
          console.log(
            '   Expires at:',
            testImage.expires_at || 'Never (permanent storage)'
          );
        }
      }

      // Clean up
      if (imageId) {
        console.log('\n3️⃣ Cleaning up test data...');
        const { data: deleted, error: deleteError } = await supabase.rpc(
          'delete_processed_image',
          {
            p_image_id: imageId,
            p_user_id: shannonId,
          }
        );
        console.log(deleted ? '✅ Cleaned up' : '❌ Cleanup failed');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSaveImage();
