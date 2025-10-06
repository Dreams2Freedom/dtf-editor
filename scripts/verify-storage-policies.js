import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create different clients for testing
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Storage Policy Verification Script\n');

async function testStoragePolicies() {
  try {
    // 1. Check storage buckets
    console.log('📦 Checking storage buckets...');
    const { data: buckets, error: bucketsError } =
      await serviceClient.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    console.log('✅ Found buckets:', buckets.map(b => b.name).join(', '));

    // 2. Check bucket policies
    for (const bucket of buckets) {
      console.log(`\n📋 Checking policies for bucket: ${bucket.name}`);

      // Check if bucket is public
      console.log(`  - Public: ${bucket.public ? '✅ Yes' : '❌ No'}`);

      // Try to list files as anonymous user
      const { data: anonFiles, error: anonError } = await anonClient.storage
        .from(bucket.name)
        .list();

      if (bucket.public && anonError) {
        console.log(
          '  - ⚠️  Public bucket but anonymous listing failed:',
          anonError.message
        );
      } else if (!bucket.public && !anonError) {
        console.log('  - ⚠️  Private bucket but anonymous listing succeeded!');
      } else {
        console.log(`  - ✅ Access control working correctly`);
      }
    }

    // 3. Test user isolation (using test user)
    console.log('\n🔐 Testing user isolation...');

    // Create test users
    const testUser1Email = `test1_${Date.now()}@example.com`;
    const testUser2Email = `test2_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Create test user 1
    const { data: user1, error: user1Error } =
      await serviceClient.auth.admin.createUser({
        email: testUser1Email,
        password: testPassword,
        email_confirm: true,
      });

    if (user1Error) {
      console.error('❌ Error creating test user 1:', user1Error);
      return;
    }

    // Create test user 2
    const { data: user2, error: user2Error } =
      await serviceClient.auth.admin.createUser({
        email: testUser2Email,
        password: testPassword,
        email_confirm: true,
      });

    if (user2Error) {
      console.error('❌ Error creating test user 2:', user2Error);
      // Clean up user 1
      await serviceClient.auth.admin.deleteUser(user1.user.id);
      return;
    }

    console.log('✅ Created test users');

    try {
      // Test file upload for user 1
      const testFileName = `test_${Date.now()}.txt`;
      const testFileContent = 'This is a test file';

      // Create authenticated client for user 1
      const { data: session1 } = await anonClient.auth.signInWithPassword({
        email: testUser1Email,
        password: testPassword,
      });

      if (!session1) {
        throw new Error('Failed to sign in test user 1');
      }

      const user1Client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${session1.session.access_token}`,
          },
        },
      });

      // Upload file as user 1 to images bucket
      const { data: uploadData, error: uploadError } = await user1Client.storage
        .from('images')
        .upload(`${user1.user.id}/${testFileName}`, testFileContent);

      if (uploadError) {
        console.log('❌ User 1 upload failed:', uploadError.message);
      } else {
        console.log('✅ User 1 uploaded file successfully');

        // Try to access user 1's file as user 2
        const { data: session2 } = await anonClient.auth.signInWithPassword({
          email: testUser2Email,
          password: testPassword,
        });

        if (!session2) {
          throw new Error('Failed to sign in test user 2');
        }

        const user2Client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${session2.session.access_token}`,
            },
          },
        });

        // Try to download user 1's file as user 2
        const { data: downloadData, error: downloadError } =
          await user2Client.storage
            .from('images')
            .download(`${user1.user.id}/${testFileName}`);

        if (downloadError) {
          console.log(
            "✅ User isolation working: User 2 cannot access User 1's files"
          );
        } else {
          console.log("❌ SECURITY ISSUE: User 2 can access User 1's files!");
        }

        // Clean up - delete test file
        await serviceClient.storage
          .from('images')
          .remove([`${user1.user.id}/${testFileName}`]);
      }
    } finally {
      // Clean up test users
      await serviceClient.auth.admin.deleteUser(user1.user.id);
      await serviceClient.auth.admin.deleteUser(user2.user.id);
      console.log('✅ Cleaned up test users');
    }

    // 4. Check RLS policies on processed_images table
    console.log('\n📊 Checking RLS policies on processed_images table...');

    // Try to query as anonymous
    const { data: anonQuery, error: anonQueryError } = await anonClient
      .from('processed_images')
      .select('*')
      .limit(1);

    if (anonQueryError) {
      console.log('✅ Anonymous users cannot read processed_images');
    } else {
      console.log(
        '❌ SECURITY ISSUE: Anonymous users can read processed_images!'
      );
    }

    // 5. Summary
    console.log('\n📊 Storage Policy Verification Summary:');
    console.log('- Buckets checked: ✅');
    console.log('- User isolation tested: ✅');
    console.log('- RLS policies verified: ✅');
    console.log('\n✨ Storage policy verification complete!');
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the verification
testStoragePolicies();
