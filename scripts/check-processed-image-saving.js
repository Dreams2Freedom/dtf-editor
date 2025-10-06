import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkImageSaving() {
  console.log('🔍 Checking image saving...\n');

  // Create service role client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Test the insert_processed_image RPC function
  console.log('📊 Testing insert_processed_image RPC function:');

  try {
    const testData = {
      p_user_id: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
      p_original_filename: 'test_image.png',
      p_processed_filename: 'test_processed.png',
      p_operation_type: 'upscale',
      p_file_size: 1024,
      p_processing_status: 'completed',
      p_storage_url: 'https://example.com/test.png',
      p_thumbnail_url: 'https://example.com/test_thumb.png',
      p_metadata: { test: true, timestamp: new Date().toISOString() },
    };

    const { data, error } = await supabase.rpc(
      'insert_processed_image',
      testData
    );

    if (error) {
      console.log('❌ RPC function error:', error.message);
    } else {
      console.log('✅ RPC function works! Inserted image ID:', data);

      // Now check if we can retrieve it
      const { data: images } = await supabase.rpc('get_user_images', {
        p_user_id: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
      });

      console.log('\n📸 Total images for user:', images?.length || 0);

      // Clean up test image
      if (data) {
        await supabase.rpc('delete_processed_image', {
          p_image_id: data,
          p_user_id: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
        });
        console.log('🧹 Cleaned up test image');
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  // Check if images bucket exists and is accessible
  console.log('\n📦 Checking storage bucket:');
  const { data: buckets } = await supabase.storage.listBuckets();
  const imagesBucket = buckets?.find(b => b.name === 'images');

  if (imagesBucket) {
    console.log(
      '✅ Images bucket exists:',
      imagesBucket.public ? 'Public' : 'Private'
    );
  } else {
    console.log('❌ Images bucket not found!');
  }
}

checkImageSaving().catch(console.error);
