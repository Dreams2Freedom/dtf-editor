import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function simpleStorageTest() {
  console.log('🧪 Simple Storage Access Test\n');

  // Test 1: Anonymous access
  console.log('1️⃣ Testing anonymous access to private buckets...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // Try to list files in images bucket as anonymous
  const { data: anonImages, error: anonImagesError } = await anonClient.storage
    .from('images')
    .list();

  if (anonImagesError) {
    console.log('✅ Good: Anonymous cannot list images bucket');
    console.log(`   Error: ${anonImagesError.message}`);
  } else {
    console.log('❌ Bad: Anonymous CAN list images bucket');
    console.log(`   Found ${anonImages?.length || 0} items`);
  }

  // Test 2: Authenticated user access
  console.log('\n2️⃣ Testing authenticated user access...');
  
  // Sign up a test user
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError) {
    console.log('❌ Could not create test user:', signUpError.message);
    return;
  }

  if (!signUpData.user) {
    console.log('❌ No user returned from signup');
    return;
  }

  console.log(`✅ Created test user: ${signUpData.user.id}`);

  // Create authenticated client
  const { data: { session }, error: signInError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError || !session) {
    console.log('❌ Could not sign in:', signInError?.message);
    return;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  });

  // Test 3: Try to upload to correct path
  console.log('\n3️⃣ Testing file upload to correct user path...');
  const correctPath = `${signUpData.user.id}/test.txt`;
  const { error: uploadError } = await authClient.storage
    .from('images')
    .upload(correctPath, 'test content');

  if (uploadError) {
    console.log(`❌ Cannot upload to own folder: ${uploadError.message}`);
  } else {
    console.log(`✅ Successfully uploaded to: ${correctPath}`);
  }

  // Test 4: Try to upload to wrong path
  console.log('\n4️⃣ Testing file upload to wrong user path...');
  const wrongPath = `wrong-user-id/test.txt`;
  const { error: wrongUploadError } = await authClient.storage
    .from('images')
    .upload(wrongPath, 'test content');

  if (wrongUploadError) {
    console.log(`✅ Good: Cannot upload to wrong folder`);
    console.log(`   Error: ${wrongUploadError.message}`);
  } else {
    console.log(`❌ Bad: CAN upload to wrong folder!`);
  }

  // Cleanup
  if (!uploadError) {
    await authClient.storage.from('images').remove([correctPath]);
  }
  if (!wrongUploadError) {
    await authClient.storage.from('images').remove([wrongPath]);
  }

  // Delete test user
  await anonClient.auth.admin.deleteUser(signUpData.user.id).catch(() => {});
  
  console.log('\n✅ Test complete');
}

simpleStorageTest().catch(console.error);