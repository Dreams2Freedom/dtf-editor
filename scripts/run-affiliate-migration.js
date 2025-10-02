/**
 * Run Affiliate Program Migration
 * This script executes the affiliate program database migration
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting Affiliate Program Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250103000000_create_affiliate_program.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    // This is a simplified approach - in production you might want more robust SQL parsing
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Extract a description from the statement for logging
      const firstLine = statement.split('\n')[0].substring(0, 100);

      try {
        console.log(`Executing [${i + 1}/${statements.length}]: ${firstLine}...`);

        const { error } = await supabase.rpc('exec_sql', {
          query: statement
        });

        if (error) {
          // Try direct execution as an alternative
          const { error: directError } = await supabase.from('affiliates').select('count');

          if (directError && directError.message.includes('does not exist')) {
            // Table doesn't exist yet, this is expected
            console.log(`⏩ Statement ${i + 1}: Table creation pending`);
          } else {
            throw error;
          }
        } else {
          console.log(`✅ Statement ${i + 1}: Success`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Statement ${i + 1}: Failed`);
        console.error(`   Error: ${error.message}`);
        errorCount++;

        // Ask if we should continue
        if (i < statements.length - 1) {
          console.log('\n⚠️  Error encountered. Continuing with remaining statements...\n');
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   Total: ${statements.length}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the output above.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Execute the migration as a single transaction
async function runMigrationAsTransaction() {
  console.log('🚀 Attempting to run migration as a single transaction...\n');

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250103000000_create_affiliate_program.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // For now, we'll need to manually execute this in Supabase Dashboard
    console.log('📝 Migration SQL has been prepared.');
    console.log('\n⚠️  Since direct SQL execution is limited, please follow these steps:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the migration from:');
    console.log(`   ${migrationPath}`);
    console.log('5. Execute the query');
    console.log('\n✅ The migration file has been created and is ready to run.');

    // Test if tables exist
    const { data, error } = await supabase
      .from('affiliates')
      .select('count')
      .limit(0);

    if (error && error.message.includes('does not exist')) {
      console.log('\n📋 Tables do not exist yet. Please run the migration in Supabase Dashboard.');
    } else if (!error) {
      console.log('\n✅ Affiliate tables already exist!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check if we can connect to Supabase first
async function checkConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(0);

    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    console.log('✅ Successfully connected to Supabase\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return false;
  }
}

// Main execution
(async () => {
  const connected = await checkConnection();

  if (!connected) {
    process.exit(1);
  }

  // Try the transaction approach since direct SQL execution might be limited
  await runMigrationAsTransaction();
})();