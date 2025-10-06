const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProcessedImages(imageId = null) {
  console.log('🔍 Checking processed images...\n');

  try {
    // If specific ID provided, check for it
    if (imageId) {
      console.log(`Looking for image ID: ${imageId}\n`);

      const { data: image, error } = await supabase
        .from('processed_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (error) {
        console.error('❌ Error finding image:', error);
      } else if (image) {
        console.log('✅ Found image:');
        console.log('   ID:', image.id);
        console.log('   User ID:', image.user_id);
        console.log('   Original filename:', image.original_filename);
        console.log('   Processed filename:', image.processed_filename);
        console.log('   Storage URL:', image.storage_url);
        console.log('   Operation:', image.operation_type);
        console.log('   Created:', image.created_at);
        console.log('   Metadata:', JSON.stringify(image.metadata, null, 2));
      } else {
        console.log('❌ Image not found');
      }
    }

    // Get recent processed images
    const { data: recentImages, error: recentError } = await supabase
      .from('processed_images')
      .select(
        'id, user_id, original_filename, operation_type, storage_url, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent images:', recentError);
    } else {
      console.log('\n📷 Recent Processed Images:');
      if (recentImages && recentImages.length > 0) {
        recentImages.forEach((img, index) => {
          console.log(
            `\n   ${index + 1}. ${img.original_filename || 'Unknown'}`
          );
          console.log(`      ID: ${img.id}`);
          console.log(`      User: ${img.user_id}`);
          console.log(`      Operation: ${img.operation_type}`);
          console.log(`      Storage URL: ${img.storage_url}`);
          console.log(`      Created: ${img.created_at}`);
        });
      } else {
        console.log('   No processed images found');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get image ID from command line argument
const imageId = process.argv[2];
checkProcessedImages(imageId).catch(console.error);
