#!/usr/bin/env node

/**
 * Apply the processed_images table migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying processed_images table migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '012_create_processed_images_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded, executing...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n💡 You may need to run this SQL manually in the Supabase dashboard');
      console.log('\nSQL to run:');
      console.log('----------------------------------------');
      console.log(migrationSQL);
      console.log('----------------------------------------');
      return;
    }

    console.log('✅ Migration applied successfully!');
    
    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'processed_images');

    if (tables && tables.length > 0) {
      console.log('✅ Verified: processed_images table exists');
    } else {
      console.log('⚠️  Table verification failed, but migration may still have succeeded');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Please run the migration SQL manually in your Supabase dashboard');
  }
}

// Run the migration
applyMigration();