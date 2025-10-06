/**
 * Update Admin Email
 * This script updates the is_admin function to include shannon@s2transfers.com
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAdminEmail() {
  console.log('🔧 Updating Admin Email...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20250103_update_admin_email.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration content:\n');
    console.log(migrationSQL);
    console.log('\n' + '='.repeat(60) + '\n');

    // Since we can't execute raw SQL directly, provide instructions
    console.log('To apply this migration, please:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log(
      '3. Copy the SQL above or from: supabase/migrations/20250103_update_admin_email.sql'
    );
    console.log('4. Execute the query\n');

    // Test after manual execution
    console.log('After running the migration:');
    console.log('✅ shannon@s2transfers.com will have admin access');
    console.log(
      "✅ You'll be able to view all affiliates at /admin/affiliates/applications\n"
    );
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateAdminEmail();
