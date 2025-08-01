import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
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

async function applyStoragePolicies() {
  try {
    console.log('📋 Applying storage policies...\n');

    // Read the SQL file
    const sqlPath = join(__dirname, 'fix-storage-policies.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    }).single();

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql not available, trying alternative method...');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('SELECT')) {
          // Skip SELECT statements for now
          continue;
        }
        
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // Note: This is a workaround. In production, you should run these
        // through the Supabase dashboard or using migrations
        console.log('⚠️  Please run the following SQL in Supabase Dashboard:');
        console.log(statement + ';');
        console.log('---');
      }
      
      console.log('\n📝 To apply these policies:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of scripts/fix-storage-policies.sql');
      console.log('4. Click "Run" to execute');
      
      return;
    }

    console.log('✅ Storage policies applied successfully!');
    
    // Verify the policies
    console.log('\n🔍 Verifying applied policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');
    
    if (policiesError) {
      console.log('⚠️  Could not verify policies automatically');
    } else {
      console.log(`✅ Found ${policies.length} storage policies`);
    }

  } catch (error) {
    console.error('❌ Error applying storage policies:', error);
  }
}

// Also create a simpler verification function
async function getCurrentPolicies() {
  try {
    console.log('\n📊 Current Storage Configuration:\n');
    
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (!bucketsError && buckets) {
      console.log('Storage Buckets:');
      buckets.forEach(bucket => {
        console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }
    
    console.log('\n⚠️  Storage policies must be configured through Supabase Dashboard');
    console.log('   SQL Editor > New Query > Paste contents of fix-storage-policies.sql');
    
  } catch (error) {
    console.error('❌ Error checking current policies:', error);
  }
}

// Run the functions
console.log('🔐 DTF Editor - Storage Policy Configuration\n');
getCurrentPolicies();
console.log('\n');
applyStoragePolicies();