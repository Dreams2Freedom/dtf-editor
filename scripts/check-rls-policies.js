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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies...\n');

  // Tables that need RLS policies
  const tables = [
    'profiles',
    'processed_images',
    'image_collections',
    'credit_transactions',
    'images'
  ];

  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`);
    
    try {
      // Test if we can read from the table with service role
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error accessing table: ${error.message}`);
      } else {
        console.log(`   ✅ Table accessible with service role`);
      }

      // Check if RLS is enabled
      const { data: policies, error: policyError } = await supabase
        .rpc('get_policies', { table_name: table })
        .single();
      
      if (policyError) {
        console.log(`   ⚠️  Could not check policies`);
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
  }

  // Test with user context
  console.log('\n\n🧪 Testing with user context...');
  
  const email = 'snsmarketing@gmail.com';
  const password = 'TestPassword123!';
  
  // Create a user client
  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.log(`❌ Auth failed: ${authError.message}`);
    return;
  }
  
  console.log(`✅ Authenticated as: ${authData.user.email}`);
  
  // Test each table with user context
  for (const table of tables) {
    const { data, error } = await userClient
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ ${table}: ${error.message} (${error.code})`);
    } else {
      console.log(`   ✅ ${table}: Accessible`);
    }
  }
}

checkRLSPolicies().catch(console.error);