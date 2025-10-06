#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGallery() {
  try {
    console.log('🔍 Testing Image Gallery Integration...\n');

    // Test if processed_images table exists
    const { data: tableTest, error: tableError } = await supabase
      .from('processed_images')
      .select('id')
      .limit(1);

    console.log('✅ Table test:', {
      exists: !tableError,
      error: tableError?.message || 'None',
    });

    // Test if RPC function exists
    const { data: rpcTest, error: rpcError } = await supabase.rpc(
      'calculate_image_expiration',
      {
        p_user_id: 'fe290877-7586-4674-bd6f-10280b92ab00', // Your test user ID
      }
    );

    console.log('✅ RPC function test:', {
      exists: !rpcError,
      result: rpcTest,
      error: rpcError?.message || 'None',
    });

    // List all images
    const { data: images, error: listError } = await supabase
      .from('processed_images')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('\n📸 Images in gallery:', images?.length || 0);

    if (images && images.length > 0) {
      console.log('\nFirst image:');
      console.log('- Filename:', images[0].original_filename);
      console.log('- Operation:', images[0].operation_type);
      console.log('- Status:', images[0].processing_status);
      console.log('- Created:', images[0].created_at);
    }

    // Test inserting a sample image
    console.log('\n🧪 Testing image insert...');
    const testImage = {
      user_id: 'fe290877-7586-4674-bd6f-10280b92ab00',
      original_filename: 'test-image.jpg',
      processed_filename: 'test-image_processed.jpg',
      operation_type: 'upscale',
      file_size: 1024000,
      processing_status: 'completed',
      storage_url: 'https://example.com/test.jpg',
      thumbnail_url: 'https://example.com/test-thumb.jpg',
      metadata: {
        credits_used: 1,
        processing_time_ms: 1500,
        api_used: 'Deep-Image.ai',
      },
    };

    const { data: insertData, error: insertError } = await supabase
      .from('processed_images')
      .insert(testImage)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
    } else {
      console.log('✅ Insert successful!');
      console.log('- ID:', insertData.id);
      console.log('- Expires at:', insertData.expires_at || 'Never');

      // Clean up test data
      await supabase.from('processed_images').delete().eq('id', insertData.id);
      console.log('🧹 Test data cleaned up');
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testGallery();
