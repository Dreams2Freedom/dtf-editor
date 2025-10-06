/**
 * Apply AI Preview Storage Buckets Migration
 * Creates two separate buckets with appropriate RLS policies
 *
 * Run: node scripts/apply-preview-buckets-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  console.log('🔧 Applying AI Preview Storage Buckets Migration...\n');

  // Create Supabase client with service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/012_create_ai_preview_buckets.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 Executing SQL migration...\n');

    // Execute the migration
    // Note: Supabase client doesn't support raw SQL execution directly
    // We need to use the Postgres REST API or execute via psql
    console.log('⚠️  This migration needs to be applied manually via Supabase Dashboard or psql');
    console.log('\nOption 1: Supabase Dashboard SQL Editor');
    console.log('  1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql');
    console.log('  2. Paste the contents of the migration file');
    console.log('  3. Click "Run"\n');
    console.log('Option 2: Using psql');
    console.log('  psql -d postgres://[connection-string] -f ' + migrationPath);
    console.log('\nMigration SQL:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n✅ Migration file is ready to be applied');
    console.log('📌 Remember to apply this to your Supabase project!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
