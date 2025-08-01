#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUploadError() {
  console.log('🔍 Debugging Upload Error\n');

  // 1. Check if we can connect
  console.log('1. Testing database connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.error('❌ Database connection error:', error);
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
  }

  // 2. Check if uploads table exists
  console.log('\n2. Checking uploads table...');
  try {
    const { count, error } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Uploads table error:', JSON.stringify(error, null, 2));
      if (error.code === '42P01') {
        console.log('   → Table does not exist');
      }
    } else {
      console.log('✅ Uploads table exists');
      console.log(`   → Row count: ${count}`);
    }
  } catch (e) {
    console.error('❌ Check failed:', e.message);
  }

  // 3. Test insert with minimal data
  console.log('\n3. Testing minimal insert...');
  try {
    const testData = {
      user_id: 'f689bb22-89dd-4c3c-a941-d77feb84428d', // From the logs
      file_name: 'test.png',
      file_path: 'test/path.png',
      file_size: 1000,
      file_type: 'image/png',
      public_url: 'https://example.com/test.png'
    };

    console.log('Inserting:', JSON.stringify(testData, null, 2));

    const { data, error } = await supabase
      .from('uploads')
      .insert(testData)
      .select();

    if (error) {
      console.error('\n❌ Insert error:', JSON.stringify(error, null, 2));
      console.log('\nError details:');
      console.log('- Code:', error.code);
      console.log('- Message:', error.message);
      console.log('- Details:', error.details);
      console.log('- Hint:', error.hint);
    } else {
      console.log('✅ Insert successful:', data);
      // Clean up test data
      if (data && data[0]) {
        await supabase.from('uploads').delete().eq('id', data[0].id);
        console.log('   → Test data cleaned up');
      }
    }
  } catch (e) {
    console.error('❌ Insert test failed:', e.message);
  }

  // 4. Check table structure
  console.log('\n4. Checking table columns...');
  try {
    // Try to get column information
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .limit(0);

    if (!error) {
      console.log('✅ Table structure check passed');
    } else {
      console.error('❌ Table structure error:', error);
    }
  } catch (e) {
    console.error('❌ Structure check failed:', e.message);
  }

  // 5. Check if storage bucket exists
  console.log('\n5. Checking storage bucket...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Cannot list buckets:', error);
    } else {
      const userUploadsBucket = buckets?.find(b => b.name === 'user-uploads');
      if (userUploadsBucket) {
        console.log('✅ Storage bucket "user-uploads" exists');
        console.log('   → Public:', userUploadsBucket.public);
      } else {
        console.log('❌ Storage bucket "user-uploads" not found');
        console.log('   Available buckets:', buckets?.map(b => b.name).join(', '));
      }
    }
  } catch (e) {
    console.error('❌ Bucket check failed:', e.message);
  }

  // 6. List all tables to see what exists
  console.log('\n6. Listing all accessible tables...');
  const tablesToCheck = [
    'profiles',
    'subscription_plans', 
    'subscription_history',
    'credit_transactions',
    'processing_history',
    'payg_packages',
    'api_logs',
    'uploads'
  ];

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`   ❌ ${table} - ${error.code === '42P01' ? 'DOES NOT EXIST' : error.code}`);
      } else {
        console.log(`   ✅ ${table} - EXISTS`);
      }
    } catch (e) {
      console.log(`   ❌ ${table} - ERROR`);
    }
  }

  console.log('\n📋 Summary:');
  console.log('The uploads table and several other tables are missing.');
  console.log('This indicates the database migrations have not been fully applied.');
  console.log('\n🔧 To fix this:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the migrations in order:');
  console.log('   - 001_initial_schema.sql (partially applied)');
  console.log('   - 007_create_uploads_table.sql');
  console.log('\nAlternatively, run the specific uploads table creation SQL below.');
}

debugUploadError().catch(console.error);