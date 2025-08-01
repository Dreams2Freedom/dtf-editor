#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkShannonImages() {
  console.log('🔍 Checking images for Shannon...\n');
  
  const shannonId = '1596097b-8333-452a-a2bd-ea27340677ec'; // shannon@s2transfers.com
  
  try {
    // Check using RPC function
    console.log('1️⃣ Checking via RPC function...');
    const { data: rpcImages, error: rpcError } = await supabase.rpc('get_user_images', {
      p_user_id: shannonId
    });
    
    if (rpcError) {
      console.log('❌ RPC error:', rpcError);
    } else {
      console.log('✅ Found', rpcImages?.length || 0, 'images via RPC');
      if (rpcImages && rpcImages.length > 0) {
        console.log('\nLatest images:');
        rpcImages.slice(0, 5).forEach((img, i) => {
          console.log(`\n${i + 1}. ${img.original_filename}`);
          console.log(`   Operation: ${img.operation_type}`);
          console.log(`   Status: ${img.processing_status}`);
          console.log(`   Created: ${new Date(img.created_at).toLocaleString()}`);
          console.log(`   URL: ${img.storage_url || 'No URL'}`);
          console.log(`   Expires: ${img.expires_at || 'Never'}`);
        });
      }
    }
    
    // Also check the other Shannon account
    const shannonHerodId = 'fe290877-7586-4674-bd6f-10280b92ab00'; // shannonherod@gmail.com
    
    console.log('\n2️⃣ Checking shannonherod@gmail.com account...');
    const { data: herodImages, error: herodError } = await supabase.rpc('get_user_images', {
      p_user_id: shannonHerodId
    });
    
    if (herodError) {
      console.log('❌ RPC error:', herodError);
    } else {
      console.log('✅ Found', herodImages?.length || 0, 'images for shannonherod@gmail.com');
    }
    
    // Check if RPC function exists
    console.log('\n3️⃣ Testing if insert would work...');
    const testResult = await supabase.rpc('test_processed_images_access');
    console.log('Table access test:', testResult.data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkShannonImages();