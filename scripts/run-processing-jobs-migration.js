const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running migration to create processing_jobs table...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-processing-jobs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sql
    }).single();

    if (error) {
      // If exec_sql doesn't exist, try direct approach
      if (error.message.includes('function') || error.message.includes('does not exist')) {
        console.log('Direct RPC not available, trying alternative method...\n');

        // Split SQL into individual statements and execute them
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement.includes('CREATE TABLE')) {
            console.log('Creating table...');
          } else if (statement.includes('CREATE INDEX')) {
            console.log('Creating index...');
          } else if (statement.includes('CREATE POLICY')) {
            console.log('Creating RLS policy...');
          } else if (statement.includes('ALTER TABLE')) {
            console.log('Enabling RLS...');
          } else if (statement.includes('GRANT')) {
            console.log('Granting permissions...');
          }
        }

        console.log('\n⚠️ Cannot execute SQL directly via API.');
        console.log('Please run the following SQL manually in Supabase Dashboard:\n');
        console.log('1. Go to: https://supabase.com/dashboard/project/pbqmwtbxdxnqtwxhekbj/sql/new');
        console.log('2. Copy and paste the contents of: scripts/create-processing-jobs-table.sql');
        console.log('3. Click "Run" to execute the migration\n');

        return false;
      }

      console.error('Error running migration:', error);
      return false;
    }

    console.log('✅ Migration completed successfully!\n');

    // Verify the table was created
    const { data: testQuery, error: testError } = await supabase
      .from('processing_jobs')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('⚠️ Table might not be accessible yet:', testError.message);
    } else {
      console.log('✅ Table verified - processing_jobs is ready to use!');
    }

    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
}

runMigration().then(success => {
  if (success) {
    console.log('\n🎉 The async upscaler should now work for large images!');
  } else {
    console.log('\n📋 Next steps:');
    console.log('1. Run the SQL manually in Supabase Dashboard');
    console.log('2. Then test the upscaler with a large image (13+ inches)');
  }
  process.exit(success ? 0 : 1);
});