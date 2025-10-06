require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Applying RLS Fix Migration ===\n');

  // Read the migration file
  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20250104_fix_admin_rls_use_profiles.sql'
  );
  let sql = fs.readFileSync(migrationPath, 'utf8');

  // Remove comments and DO blocks (they won't work via client)
  sql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/DO \$\$[\s\S]*?END \$\$;/g, '');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`${i + 1}. Executing: ${statement.substring(0, 80)}...`);

    try {
      // We need to use raw SQL execution
      // Since we can't execute DDL via the Supabase client easily,
      // we'll output the SQL for manual execution

      console.log('   ⚠️  Cannot execute DDL via client\n');
    } catch (error) {
      console.error(`   ❌ Error:`, error.message, '\n');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('MANUAL EXECUTION REQUIRED');
  console.log('='.repeat(80));
  console.log('\nPlease run this SQL in the Supabase Dashboard SQL Editor:');
  console.log('https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new\n');
  console.log(sql);
  console.log('\n' + '='.repeat(80));

  console.log('\nAlternatively, install Supabase CLI and run:');
  console.log('  brew install supabase/tap/supabase');
  console.log('  supabase db push');
})();
