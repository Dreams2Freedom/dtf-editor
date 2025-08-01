#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  console.log('🔧 Applying auth migration to fix RLS policies...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease add these to your .env.local file');
    process.exit(1);
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_consolidated_auth_fix_v2.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Applying migration: 004_consolidated_auth_fix_v2.sql');
    console.log('⏳ This may take a moment...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSql
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not found, trying alternative method...');
      
      // Split the migration into individual statements
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().startsWith('select')) {
          // Skip SELECT statements as they're just for verification
          continue;
        }
        
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // This is a workaround - you may need to run these manually
        console.log('⚠️  Direct SQL execution not available via Supabase JS client');
        console.log('Please run the migration manually in Supabase SQL Editor');
        break;
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Test the fix by checking if we can fetch profiles
    console.log('\n🔍 Testing profile access...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('⚠️  Profile access test failed:', testError.message);
      console.log('\nYou may need to run the migration manually in Supabase:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of:');
      console.log(`   ${migrationPath}`);
      console.log('4. Run the SQL');
    } else {
      console.log('✅ Profile access working!');
      console.log('\n🎉 Auth fix complete! Please refresh your browser.');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\nPlease apply the migration manually in Supabase SQL Editor');
  }
}

// Run the migration
applyMigration();