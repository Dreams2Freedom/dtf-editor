/**
 * Fix Affiliate Admin Access
 * This script applies the admin access RLS policies for the affiliate program
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixAdminAccess() {
  console.log('🔧 Fixing Affiliate Admin Access...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250103_fix_affiliate_admin_access.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL loaded\n');
    console.log('Due to Supabase client limitations, please run this migration manually:\n');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Create a new query');
    console.log('3. Copy the SQL from: supabase/migrations/20250103_fix_affiliate_admin_access.sql');
    console.log('4. Execute the query\n');

    // Test current access
    console.log('Testing current access...\n');

    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('*')
      .limit(1);

    if (affiliatesError) {
      console.log('❌ Cannot access affiliates table:', affiliatesError.message);
      console.log('   This is expected if you\'re not running as an admin user');
      console.log('   The migration will fix this for admin users\n');
    } else {
      console.log('✅ Can access affiliates table (you may already be admin or using service key)\n');
    }

    // Check if the is_admin function exists
    const { data: functionExists, error: functionError } = await supabase
      .rpc('is_admin', { user_id: '00000000-0000-0000-0000-000000000000' });

    if (functionError && functionError.message.includes('does not exist')) {
      console.log('ℹ️  is_admin function does not exist yet - migration needs to be run\n');
    } else if (functionError) {
      console.log('⚠️  Error checking is_admin function:', functionError.message);
    } else {
      console.log('✅ is_admin function exists\n');
    }

    console.log('After running the migration in Supabase Dashboard:');
    console.log('- Admin users will be able to view all affiliate data');
    console.log('- Admin users will be able to update affiliate applications');
    console.log('- Regular users will still only see their own data\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminAccess();
