#!/usr/bin/env node

/**
 * Apply user settings migration to add notification preferences and other columns
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📝 Applying user settings migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '011_add_user_settings_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try executing statements individually
      console.log('⚠️  exec_sql not available, executing statements individually...\n');
      
      const statements = migrationSQL
        .split(';')
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        if (statement.includes('--') || statement.length < 10) continue;
        
        console.log('Executing:', statement.substring(0, 50) + '...');
        
        // For ALTER TABLE and CREATE INDEX, we need to use raw SQL
        // Since Supabase doesn't expose these through the client library
        console.log('⚠️  Note: This statement needs to be run directly in Supabase dashboard');
      }

      console.log('\n📋 To complete the migration, please run the following SQL in your Supabase dashboard:\n');
      console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
      console.log('2. Run this SQL:\n');
      console.log(migrationSQL);
      
      return;
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify the columns exist
    const { data: columns, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (!verifyError && columns && columns.length > 0) {
      const profile = columns[0];
      console.log('✅ Verified columns exist:');
      console.log('  - notification_preferences:', 'notification_preferences' in profile ? '✓' : '✗');
      console.log('  - company_name:', 'company_name' in profile ? '✓' : '✗');
      console.log('  - phone:', 'phone' in profile ? '✓' : '✗');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('\n📋 Please run the migration manually in your Supabase dashboard');
  }
}

// Run the migration
applyMigration();