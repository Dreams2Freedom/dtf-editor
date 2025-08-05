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

async function checkAllImages() {
  console.log('🔍 Checking all images in database...\n');
  
  // Create service role client to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get all images
  const { data: images, error, count } = await supabase
    .from('processed_images')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`📊 Total images in database: ${count || 0}`);
  
  if (images && images.length > 0) {
    console.log('\n📸 Recent images:');
    images.forEach((img, i) => {
      console.log(`\n${i + 1}. Image ID: ${img.id}`);
      console.log(`   User ID: ${img.user_id}`);
      console.log(`   Operation: ${img.operation_type}`);
      console.log(`   Status: ${img.processing_status}`);
      console.log(`   Created: ${img.created_at}`);
      console.log(`   Storage URL: ${img.storage_url ? 'Yes' : 'No'}`);
    });
    
    // Check user distribution
    const userCounts = {};
    images.forEach(img => {
      userCounts[img.user_id] = (userCounts[img.user_id] || 0) + 1;
    });
    
    console.log('\n👥 Images by user:');
    Object.entries(userCounts).forEach(([userId, count]) => {
      console.log(`   ${userId}: ${count} images`);
    });
  } else {
    console.log('\n⚠️  No images found in the database');
  }
  
  // Check if RPC function exists
  console.log('\n🔧 Checking RPC functions:');
  const { data: functions } = await supabase.rpc('get_user_images', {
    p_user_id: 'f689bb22-89dd-4c3c-a941-d77feb84428d'
  });
  
  console.log('RPC function get_user_images:', functions ? 'Works' : 'Not found');
}

checkAllImages().catch(console.error);