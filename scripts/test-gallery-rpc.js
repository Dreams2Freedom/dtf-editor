import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testGalleryAccess() {
  console.log('🔍 Testing gallery access...\n');
  
  // Create client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'snsmarketing@gmail.com',
    password: 'TestPassword123!'
  });
  
  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    return;
  }
  
  console.log('✅ Authenticated as:', authData.user.email);
  console.log('User ID:', authData.user.id);
  
  // Test 1: Direct table access
  console.log('\n📊 Test 1: Direct table access');
  const { data: directData, error: directError } = await supabase
    .from('processed_images')
    .select('*')
    .eq('user_id', authData.user.id);
  
  console.log('Direct access:', {
    success: !directError,
    error: directError?.message,
    count: directData?.length || 0
  });
  
  // Test 2: RPC function
  console.log('\n📊 Test 2: RPC function get_user_images');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_images', {
    p_user_id: authData.user.id
  });
  
  console.log('RPC access:', {
    success: !rpcError,
    error: rpcError?.message,
    count: rpcData?.length || 0
  });
  
  // Test 3: Check if images exist at all
  console.log('\n📊 Test 3: Check all images in table (service role would see)');
  const { data: countData, error: countError } = await supabase
    .from('processed_images')
    .select('id, user_id, created_at', { count: 'exact' })
    .limit(5);
  
  console.log('Sample images:', {
    success: !countError,
    error: countError?.message,
    samples: countData?.map(img => ({
      id: img.id.substring(0, 8) + '...',
      user_id: img.user_id.substring(0, 8) + '...',
      created_at: img.created_at
    }))
  });
}

testGalleryAccess().catch(console.error);