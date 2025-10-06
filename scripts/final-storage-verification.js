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

async function finalVerification() {
  console.log('🔒 Final Storage Security Verification\n');

  const results = {
    passed: 0,
    failed: 0,
  };

  // Create two test users
  const user1Email = `user1_${Date.now()}@test.com`;
  const user2Email = `user2_${Date.now()}@test.com`;
  const password = 'TestPassword123!';

  const {
    data: { user: user1 },
  } = await serviceClient.auth.admin.createUser({
    email: user1Email,
    password,
    email_confirm: true,
  });

  const {
    data: { user: user2 },
  } = await serviceClient.auth.admin.createUser({
    email: user2Email,
    password,
    email_confirm: true,
  });

  if (!user1 || !user2) {
    console.error('Failed to create test users');
    return;
  }

  try {
    // Test 1: User 1 uploads a file
    console.log('📝 Test 1: User 1 uploads to their folder');
    const { data: session1 } = await serviceClient.auth.signInWithPassword({
      email: user1Email,
      password,
    });

    const user1Client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session1.session.access_token}` },
      },
    });

    const user1File = `${user1.id}/private-doc.txt`;
    const { error: upload1Error } = await user1Client.storage
      .from('images')
      .upload(user1File, 'User 1 private data');

    if (!upload1Error) {
      console.log('✅ PASS: User 1 can upload to their folder');
      results.passed++;
    } else {
      console.log('❌ FAIL: User 1 cannot upload to their folder');
      results.failed++;
    }

    // Test 2: User 2 tries to read User 1's file
    console.log("\n📝 Test 2: User 2 tries to read User 1's file");
    const { data: session2 } = await serviceClient.auth.signInWithPassword({
      email: user2Email,
      password,
    });

    const user2Client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session2.session.access_token}` },
      },
    });

    const { data: downloadData, error: downloadError } =
      await user2Client.storage.from('images').download(user1File);

    if (downloadError) {
      console.log("✅ PASS: User 2 cannot read User 1's file");
      results.passed++;
    } else {
      console.log("❌ FAIL: User 2 CAN read User 1's file!");
      results.failed++;
    }

    // Test 3: User 2 tries to delete User 1's file
    console.log("\n📝 Test 3: User 2 tries to delete User 1's file");
    const { error: deleteError } = await user2Client.storage
      .from('images')
      .remove([user1File]);

    if (deleteError) {
      console.log("✅ PASS: User 2 cannot delete User 1's file");
      results.passed++;
    } else {
      console.log("❌ FAIL: User 2 CAN delete User 1's file!");
      results.failed++;
    }

    // Test 4: User 2 tries to upload to User 1's folder
    console.log("\n📝 Test 4: User 2 tries to upload to User 1's folder");
    const wrongFile = `${user1.id}/hacker.txt`;
    const { error: wrongUploadError } = await user2Client.storage
      .from('images')
      .upload(wrongFile, 'Hacker data');

    if (wrongUploadError) {
      console.log("✅ PASS: User 2 cannot upload to User 1's folder");
      results.passed++;
    } else {
      console.log("❌ FAIL: User 2 CAN upload to User 1's folder!");
      results.failed++;
    }

    // Test 5: Anonymous access
    console.log('\n📝 Test 5: Anonymous tries to access files');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonDownload, error: anonError } = await anonClient.storage
      .from('images')
      .download(user1File);

    if (anonError) {
      console.log('✅ PASS: Anonymous cannot download files');
      results.passed++;
    } else {
      console.log('❌ FAIL: Anonymous CAN download files!');
      results.failed++;
    }

    // Cleanup
    await serviceClient.storage.from('images').remove([user1File]);
  } finally {
    // Delete test users
    await serviceClient.auth.admin.deleteUser(user1.id);
    await serviceClient.auth.admin.deleteUser(user2.id);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL RESULTS:');
  console.log(`✅ Passed: ${results.passed}/5 tests`);
  console.log(`❌ Failed: ${results.failed}/5 tests`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL SECURITY TESTS PASSED! Storage is properly secured.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the policies.');
  }
}

finalVerification().catch(console.error);
