#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test with authenticated user approach
async function testWithAuth() {
  console.log('🔍 Testing Image Gallery with authenticated user...\n');

  // Create client with anon key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Sign in as test user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: 'shannonherod@gmail.com',
        password: 'Anteater2020!',
      });

    if (authError) {
      console.log('❌ Auth error:', authError.message);
      return;
    }

    console.log('✅ Authenticated as:', authData.user.email);
    console.log('User ID:', authData.user.id);

    // Test inserting an image
    const testImage = {
      user_id: authData.user.id,
      original_filename: 'test-auth-image.jpg',
      processed_filename: 'test-auth-image_processed.jpg',
      operation_type: 'upscale',
      file_size: 1024000,
      processing_status: 'completed',
      storage_url: 'https://example.com/test-auth.jpg',
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

      // List user's images
      const { data: images, error: listError } = await supabase
        .from('processed_images')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });

      console.log('\n📸 User has', images?.length || 0, 'images in gallery');

      // Clean up test data
      if (insertData?.id) {
        await supabase
          .from('processed_images')
          .delete()
          .eq('id', insertData.id);
        console.log('🧹 Test data cleaned up');
      }
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testWithAuth();
