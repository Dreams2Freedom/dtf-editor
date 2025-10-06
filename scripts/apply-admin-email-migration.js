/**
 * Apply Admin Email Migration
 * This script applies the admin email update directly to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🚀 Applying Admin Email Migration...\n');

  try {
    // The SQL to update the is_admin function
    const updateFunction = `
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email IN (
        'shannon@s2transfers.com',
        'shannonherod@gmail.com',
        'admin@dtfeditor.com'
      )
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `.trim();

    console.log('📝 SQL to execute:\n');
    console.log(updateFunction);
    console.log('\n' + '='.repeat(60) + '\n');

    // Unfortunately, Supabase client doesn't allow executing raw SQL
    // We need to use the Supabase Dashboard SQL Editor
    console.log(
      '⚠️  Direct SQL execution is not available via the client library.\n'
    );
    console.log('Please apply this migration by:\n');
    console.log('Method 1: Using Supabase Dashboard (Recommended)');
    console.log('  1. Go to https://supabase.com/dashboard');
    console.log('  2. Select your project');
    console.log('  3. Go to SQL Editor');
    console.log('  4. Create a new query');
    console.log('  5. Paste the SQL above');
    console.log('  6. Click "Run"\n');

    console.log('Method 2: Using Supabase CLI');
    console.log('  1. Install: npm install -g supabase');
    console.log('  2. Run: supabase db push --db-url <your-db-url>\n');

    // Test current status
    console.log('Testing current admin access...\n');

    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    const adminEmails = ['shannon@s2transfers.com', 'shannonherod@gmail.com'];
    const adminUser = users.users.find(u => adminEmails.includes(u.email));

    if (adminUser) {
      console.log(`Found user: ${adminUser.email}`);

      // Test if is_admin function works
      const { data: isAdmin, error: adminError } = await supabase.rpc(
        'is_admin',
        { user_id: adminUser.id }
      );

      if (adminError) {
        console.log('❌ is_admin function error:', adminError.message);
      } else {
        console.log(`is_admin result: ${isAdmin}`);
        if (isAdmin) {
          console.log('✅ Admin access is already configured correctly!');
        } else {
          console.log(
            '⚠️  Admin access needs to be configured - run the migration above'
          );
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyMigration();
