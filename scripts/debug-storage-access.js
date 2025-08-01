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

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Debug Storage Access\n');

async function debugStorageAccess() {
  try {
    // 1. Get detailed bucket info
    console.log('📦 Checking bucket configurations...\n');
    const { data: buckets, error: bucketsError } = await serviceClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    for (const bucket of buckets) {
      console.log(`Bucket: ${bucket.name}`);
      console.log(`  ID: ${bucket.id}`);
      console.log(`  Public: ${bucket.public}`);
      console.log(`  Created: ${bucket.created_at}`);
      console.log('');
    }

    // 2. Test with specific file paths
    console.log('🧪 Testing specific access patterns...\n');
    
    // Create test users
    const testUser1Email = `test1_${Date.now()}@example.com`;
    const testUser2Email = `test2_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: user1 } = await serviceClient.auth.admin.createUser({
      email: testUser1Email,
      password: testPassword,
      email_confirm: true
    });

    const { data: user2 } = await serviceClient.auth.admin.createUser({
      email: testUser2Email,
      password: testPassword,
      email_confirm: true
    });

    if (!user1 || !user2) {
      console.error('❌ Failed to create test users');
      return;
    }

    console.log('✅ Created test users');
    console.log(`  User 1 ID: ${user1.user.id}`);
    console.log(`  User 2 ID: ${user2.user.id}`);

    try {
      // Sign in as user 1
      const { data: session1 } = await serviceClient.auth.signInWithPassword({
        email: testUser1Email,
        password: testPassword
      });

      if (!session1) {
        throw new Error('Failed to sign in test user 1');
      }

      const user1Client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${session1.session.access_token}`
          }
        }
      });

      // Test different file paths
      const testCases = [
        `${user1.user.id}/test.jpg`,                    // Should work
        `${user2.user.id}/test.jpg`,                    // Should fail
        `test.jpg`,                                      // Should fail
        `${user1.user.id}/subfolder/test.jpg`,         // Should work
        `shared/${user1.user.id}/test.jpg`,            // Depends on policy
      ];

      console.log('\n📝 Testing file upload paths for User 1:\n');
      
      for (const path of testCases) {
        console.log(`Testing path: ${path}`);
        
        // Try to upload
        const { error: uploadError } = await user1Client.storage
          .from('images')
          .upload(path, 'test content', {
            upsert: true
          });

        if (uploadError) {
          console.log(`  ❌ Upload failed: ${uploadError.message}`);
        } else {
          console.log(`  ✅ Upload succeeded`);
          
          // Clean up
          await serviceClient.storage.from('images').remove([path]);
        }
      }

      // Now test as User 2 trying to access User 1's file
      console.log('\n🔐 Testing cross-user access:\n');
      
      // First, have User 1 upload a file
      const user1File = `${user1.user.id}/private-file.jpg`;
      const { error: user1UploadError } = await user1Client.storage
        .from('images')
        .upload(user1File, 'User 1 private content');

      if (user1UploadError) {
        console.log(`❌ User 1 couldn't upload their own file: ${user1UploadError.message}`);
      } else {
        console.log(`✅ User 1 uploaded: ${user1File}`);

        // Sign in as User 2
        const { data: session2 } = await serviceClient.auth.signInWithPassword({
          email: testUser2Email,
          password: testPassword
        });

        if (session2) {
          const user2Client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            },
            global: {
              headers: {
                Authorization: `Bearer ${session2.session.access_token}`
              }
            }
          });

          // Try to access User 1's file as User 2
          console.log(`\nUser 2 trying to access User 1's file...`);
          
          // Try download
          const { data: downloadData, error: downloadError } = await user2Client.storage
            .from('images')
            .download(user1File);

          if (downloadError) {
            console.log(`✅ GOOD: User 2 cannot download User 1's file`);
            console.log(`   Error: ${downloadError.message}`);
          } else {
            console.log(`❌ BAD: User 2 CAN download User 1's file!`);
          }

          // Try to get public URL
          const { data: urlData } = user2Client.storage
            .from('images')
            .getPublicUrl(user1File);

          console.log(`\nPublic URL generated: ${urlData.publicUrl}`);
          
          // Try to fetch the URL
          try {
            const response = await fetch(urlData.publicUrl);
            if (response.ok) {
              console.log(`❌ BAD: Public URL is accessible without auth`);
            } else {
              console.log(`✅ GOOD: Public URL returns ${response.status}`);
            }
          } catch (e) {
            console.log(`✅ GOOD: Public URL is not accessible`);
          }
        }

        // Clean up the test file
        await serviceClient.storage.from('images').remove([user1File]);
      }

    } finally {
      // Clean up test users
      await serviceClient.auth.admin.deleteUser(user1.user.id);
      await serviceClient.auth.admin.deleteUser(user2.user.id);
      console.log('\n✅ Cleaned up test users');
    }

    // 3. Check RLS status
    console.log('\n📊 RLS Check SQL:\n');
    console.log('Run this in Supabase SQL Editor to check RLS status:');
    console.log(`
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check active policies
SELECT policyname, cmd, roles, qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Enable RLS if needed
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `);

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugStorageAccess();