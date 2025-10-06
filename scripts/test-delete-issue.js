import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function testDeleteIssue() {
  console.log('🧪 Testing Delete Operation\n');

  // Create test users
  const {
    data: { user: user1 },
  } = await serviceClient.auth.admin.createUser({
    email: `user1_${Date.now()}@test.com`,
    password: 'Test123!',
    email_confirm: true,
  });

  const {
    data: { user: user2 },
  } = await serviceClient.auth.admin.createUser({
    email: `user2_${Date.now()}@test.com`,
    password: 'Test123!',
    email_confirm: true,
  });

  try {
    // User 1 uploads a file
    const { data: session1 } = await serviceClient.auth.signInWithPassword({
      email: user1.email,
      password: 'Test123!',
    });

    const user1Client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session1.session.access_token}` },
      },
    });

    const testFile = `${user1.id}/test-file.txt`;
    console.log(`User 1 uploading: ${testFile}`);

    await user1Client.storage.from('images').upload(testFile, 'test data');

    // User 2 tries to delete
    const { data: session2 } = await serviceClient.auth.signInWithPassword({
      email: user2.email,
      password: 'Test123!',
    });

    const user2Client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session2.session.access_token}` },
      },
    });

    console.log(`\nUser 2 (${user2.id}) trying to delete User 1's file...`);

    const { data: deleteData, error: deleteError } = await user2Client.storage
      .from('images')
      .remove([testFile]);

    console.log('Delete result:');
    console.log('- Data:', deleteData);
    console.log('- Error:', deleteError);

    // Check if file still exists
    const { data: checkData, error: checkError } = await user1Client.storage
      .from('images')
      .download(testFile);

    if (checkError) {
      console.log('\n⚠️  File was actually deleted!');
    } else {
      console.log('\n✅ File still exists (delete was silently rejected)');
    }
  } finally {
    await serviceClient.auth.admin.deleteUser(user1.id);
    await serviceClient.auth.admin.deleteUser(user2.id);
  }
}

testDeleteIssue().catch(console.error);
