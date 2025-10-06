#!/usr/bin/env node

/**
 * Setup Support Tables in Supabase
 * Run this script to create the support ticket tables in your database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n📝 Make sure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupSupportTables() {
  console.log('🚀 Setting up support ticket tables...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20250115_support_tickets.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements (basic split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Extract a description from the statement
      let description = 'SQL statement';
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE[^(]+\s+([^\s(]+)/i);
        description = `Creating table: ${match?.[1] || 'unknown'}`;
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX[^O]*\s+([^\s]+)/i);
        description = `Creating index: ${match?.[1] || 'unknown'}`;
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY\s+"([^"]+)"/i);
        description = `Creating policy: ${match?.[1] || 'unknown'}`;
      } else if (statement.includes('CREATE FUNCTION')) {
        const match = statement.match(/CREATE[^F]*FUNCTION\s+([^\s(]+)/i);
        description = `Creating function: ${match?.[1] || 'unknown'}`;
      } else if (statement.includes('CREATE TRIGGER')) {
        const match = statement.match(/CREATE TRIGGER\s+([^\s]+)/i);
        description = `Creating trigger: ${match?.[1] || 'unknown'}`;
      } else if (statement.includes('CREATE SEQUENCE')) {
        const match = statement.match(/CREATE SEQUENCE[^(]*\s+([^\s]+)/i);
        description = `Creating sequence: ${match?.[1] || 'unknown'}`;
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE\s+([^\s]+)/i);
        description = `Altering table: ${match?.[1] || 'unknown'}`;
      }

      console.log(`[${i + 1}/${statements.length}] ${description}`);

      const { error } = await supabase
        .rpc('exec_sql', {
          sql: statement,
        })
        .catch(err => {
          // If RPC doesn't exist, try direct execution (won't work with RLS)
          console.log(
            '   ⚠️  Note: exec_sql RPC not found, some statements may need manual execution'
          );
          return { error: err };
        });

      if (error) {
        // Check if it's a "already exists" error which we can ignore
        if (error.message?.includes('already exists')) {
          console.log('   ✓ Already exists, skipping');
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          // Continue with other statements even if one fails
        }
      } else {
        console.log('   ✓ Success');
      }
    }

    console.log('\n✅ Support tables setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log(
      '3. If any statements failed above, copy and run the migration file manually'
    );
    console.log('4. The support system should now be available at /support');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.log('\n📝 Manual setup required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log(
      '3. Copy the contents of supabase/migrations/20250115_support_tickets.sql'
    );
    console.log('4. Paste and run it in the SQL Editor');
  }
}

// Run the setup
setupSupportTables();
