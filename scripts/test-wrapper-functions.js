#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWrapperFunctions() {
  console.log('🔍 Testing wrapper functions...\n');

  const userId = 'fe290877-7586-4674-bd6f-10280b92ab00'; // shannonherod@gmail.com

  try {
    // 1. Test insert function
    console.log('1️⃣ Testing insert_processed_image function...');

    const { data: imageId, error: insertError } = await supabase.rpc(
      'insert_processed_image',
      {
        p_user_id: userId,
        p_original_filename: 'wrapper-test.jpg',
        p_processed_filename: 'wrapper-test_upscaled.jpg',
        p_operation_type: 'upscale',
        p_file_size: 2048000,
        p_processing_status: 'completed',
        p_storage_url: 'https://example.com/wrapper-test.jpg',
        p_metadata: {
          credits_used: 1,
          processing_time_ms: 1200,
          api_used: 'Deep-Image.ai',
        },
      }
    );

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
    } else {
      console.log('✅ Insert successful!');
      console.log('   Image ID:', imageId);
    }

    // 2. Test get function
    console.log('\n2️⃣ Testing get_user_images function...');

    const { data: images, error: getError } = await supabase.rpc(
      'get_user_images',
      {
        p_user_id: userId,
      }
    );

    if (getError) {
      console.log('❌ Get failed:', getError.message);
    } else {
      console.log('✅ Get successful!');
      console.log('   Found', images.length, 'images');
      if (images.length > 0) {
        console.log('\n   Latest image:');
        const latest = images[0];
        console.log('   - Filename:', latest.original_filename);
        console.log('   - Operation:', latest.operation_type);
        console.log('   - URL:', latest.storage_url);
        console.log('   - Expires:', latest.expires_at || 'Never');
      }
    }

    // 3. Test delete function (clean up test data)
    if (imageId) {
      console.log('\n3️⃣ Testing delete_processed_image function...');

      const { data: deleted, error: deleteError } = await supabase.rpc(
        'delete_processed_image',
        {
          p_image_id: imageId,
          p_user_id: userId,
        }
      );

      if (deleteError) {
        console.log('❌ Delete failed:', deleteError.message);
      } else {
        console.log('✅ Delete successful!');
        console.log('   Image deleted:', deleted);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testWrapperFunctions();
