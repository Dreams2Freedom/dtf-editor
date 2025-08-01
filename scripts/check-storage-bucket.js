#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStorageBucket() {
  console.log('🔍 Checking storage bucket configuration...\n');
  
  try {
    // List buckets
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      console.log('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log('📦 Storage buckets:');
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`);
    });
    
    // Check if user-images bucket exists
    const userImagesBucket = buckets.find(b => b.name === 'user-images');
    if (userImagesBucket) {
      console.log('\n✅ user-images bucket exists');
      console.log('   Public:', userImagesBucket.public);
      
      // Test creating a signed URL
      const testPath = '1596097b-8333-452a-a2bd-ea27340677ec/processed/test.png';
      
      if (!userImagesBucket.public) {
        console.log('\n🔐 Bucket is private, testing signed URL...');
        const { data: signedUrl, error: signError } = await supabase
          .storage
          .from('user-images')
          .createSignedUrl(testPath, 3600); // 1 hour
          
        if (signError) {
          console.log('❌ Error creating signed URL:', signError);
        } else {
          console.log('✅ Signed URL example:', signedUrl.signedUrl.substring(0, 100) + '...');
        }
      } else {
        console.log('\n🌐 Bucket is public, URLs should work directly');
      }
    } else {
      console.log('\n❌ user-images bucket not found!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkStorageBucket();