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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActivePolicies() {
  console.log('🔍 Checking Active Storage Policies\n');

  try {
    // Query to check storage policies
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');

    if (error) {
      console.error('❌ Error fetching policies:', error);

      // Try alternative approach
      console.log(
        '\n📋 Alternative: Please run this query in Supabase SQL Editor:\n'
      );
      console.log(`SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual LIKE '%images%' THEN 'images'
    WHEN qual LIKE '%user-images%' THEN 'user-images'
    WHEN qual LIKE '%user-uploads%' THEN 'user-uploads'
    ELSE 'unknown'
  END as bucket,
  qual as policy_condition
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY bucket, policyname;`);
      return;
    }

    if (!policies || policies.length === 0) {
      console.log('⚠️  No storage policies found!');
      console.log('\nThis might mean:');
      console.log("1. The policies haven't been applied yet");
      console.log('2. RLS is not enabled on storage.objects');
      console.log('3. The policies were applied to a different schema\n');

      console.log('To enable RLS on storage.objects, run:');
      console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
      return;
    }

    console.log(`✅ Found ${policies.length} storage policies:\n`);

    // Group by bucket
    const bucketPolicies = {};

    policies.forEach(policy => {
      let bucket = 'unknown';
      if (policy.qual?.includes('images')) bucket = 'images';
      else if (policy.qual?.includes('user-images')) bucket = 'user-images';
      else if (policy.qual?.includes('user-uploads')) bucket = 'user-uploads';

      if (!bucketPolicies[bucket]) bucketPolicies[bucket] = [];
      bucketPolicies[bucket].push(policy);
    });

    // Display policies by bucket
    Object.entries(bucketPolicies).forEach(([bucket, bucketPols]) => {
      console.log(`📦 Bucket: ${bucket}`);
      bucketPols.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
        console.log(`    Roles: ${policy.roles}`);
        console.log(`    Permissive: ${policy.permissive ? 'Yes' : 'No'}`);
      });
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error checking policies:', error);
  }
}

// Check if RLS is enabled
async function checkRLSEnabled() {
  console.log('\n🔒 Checking if RLS is enabled on storage.objects...\n');

  const query = `
    SELECT 
      schemaname,
      tablename,
      rowsecurity
    FROM pg_tables
    WHERE schemaname = 'storage' 
      AND tablename = 'objects';
  `;

  console.log('Please run this query in Supabase SQL Editor:');
  console.log(query);
  console.log('\nIf rowsecurity is FALSE, enable it with:');
  console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
}

// Run checks
checkActivePolicies();
checkRLSEnabled();
