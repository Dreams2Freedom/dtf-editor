require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Applying is_admin Function ===\n');

  // Read the migration file
  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20250103_update_admin_email.sql'
  );
  let sql = fs.readFileSync(migrationPath, 'utf8');

  // Remove the test block (DO $$ ... END $$;) as it won't work via RPC
  sql = sql.replace(/-- Test the function[\s\S]*?END \$\$;/g, '');

  console.log('Executing SQL to create is_admin function...\n');
  console.log('SQL:', sql.substring(0, 200) + '...\n');

  // Try to execute via raw SQL - we'll need to use a different approach
  // Since we can't use exec_sql, we'll manually recreate the function via the REST API

  const functionSQL = `
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user email is in admin list
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

  console.log(
    'Unfortunately, we cannot execute raw SQL functions via the Supabase client.'
  );
  console.log('You need to run this SQL manually in the Supabase dashboard:\n');
  console.log('='.repeat(80));
  console.log(functionSQL);
  console.log('='.repeat(80));
  console.log('\nSteps:');
  console.log(
    '1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/editor'
  );
  console.log('2. Click the SQL Editor');
  console.log('3. Paste the SQL above');
  console.log('4. Click "Run"');
  console.log('\nOR use the Supabase CLI:');
  console.log('  supabase db push');
  console.log('  supabase migration up');
})();
