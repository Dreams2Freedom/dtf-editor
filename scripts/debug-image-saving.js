#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugImageSaving() {
  console.log('🔍 Debugging Image Saving Issue...\n');
  
  const userId = 'fe290877-7586-4674-bd6f-10280b92ab00'; // shannonherod@gmail.com
  
  try {
    // 1. Test direct insert to processed_images
    console.log('1️⃣ Testing direct insert to processed_images table...');
    
    const testImage = {
      user_id: userId,
      original_filename: 'debug-test.jpg',
      processed_filename: 'debug-test_upscaled.jpg',
      operation_type: 'upscale',
      file_size: 1024000,
      processing_status: 'completed',
      storage_url: 'https://example.com/debug-test.jpg',
      metadata: {
        credits_used: 1,
        processing_time_ms: 1500,
        api_used: 'Deep-Image.ai'
      }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('processed_images')
      .insert(testImage)
      .select()
      .single();
      
    if (insertError) {
      console.log('❌ Direct insert failed:', insertError.message);
      console.log('   Error details:', insertError);
    } else {
      console.log('✅ Direct insert successful!');
      console.log('   Image ID:', insertData.id);
    }
    
    // 2. Test the RPC function
    console.log('\n2️⃣ Testing calculate_image_expiration RPC...');
    
    const { data: expirationData, error: rpcError } = await supabase
      .rpc('calculate_image_expiration', { p_user_id: userId });
      
    if (rpcError) {
      console.log('❌ RPC function failed:', rpcError.message);
    } else {
      console.log('✅ RPC function works!');
      console.log('   Expiration:', expirationData || 'No expiration (permanent)');
    }
    
    // 3. Check user's profile to understand storage policy
    console.log('\n3️⃣ Checking user profile for storage policy...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, last_credit_purchase_at')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
    } else {
      console.log('✅ Profile fetched:');
      console.log('   Plan:', profile.subscription_plan || 'free');
      console.log('   Last credit purchase:', profile.last_credit_purchase_at || 'Never');
      
      // Determine storage policy
      if (profile.subscription_plan && profile.subscription_plan !== 'free') {
        console.log('   📦 Storage: PERMANENT (paid user)');
      } else if (profile.last_credit_purchase_at) {
        console.log('   📦 Storage: 90 DAYS (pay-as-you-go user)');
      } else {
        console.log('   📦 Storage: 48 HOURS (free user)');
      }
    }
    
    // 4. List all images for this user
    console.log('\n4️⃣ Listing all images for user...');
    
    const { data: images, error: listError } = await supabase
      .from('processed_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (listError) {
      console.log('❌ Image list failed:', listError.message);
    } else {
      console.log('✅ Found', images.length, 'images');
      if (images.length > 0) {
        console.log('\nRecent images:');
        images.slice(0, 3).forEach((img, i) => {
          console.log(`   ${i + 1}. ${img.original_filename}`);
          console.log(`      Operation: ${img.operation_type}`);
          console.log(`      Status: ${img.processing_status}`);
          console.log(`      Created: ${new Date(img.created_at).toLocaleString()}`);
          console.log(`      URL: ${img.storage_url || 'No URL'}`);
        });
      }
    }
    
    // 5. Clean up test data
    if (insertData?.id) {
      console.log('\n5️⃣ Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('processed_images')
        .delete()
        .eq('id', insertData.id);
        
      if (deleteError) {
        console.log('❌ Cleanup failed:', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugImageSaving();