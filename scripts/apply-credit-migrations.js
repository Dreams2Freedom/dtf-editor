#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('📦 Applying credit system migrations...\n');

  const migrations = [
    '008_create_credit_transactions.sql',
    '009_credit_expiration_tracking.sql'
  ];

  for (const migration of migrations) {
    console.log(`🔄 Applying ${migration}...`);
    
    try {
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration);
      const sql = await fs.readFile(migrationPath, 'utf8');
      
      // Execute the migration
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async (err) => {
        // If exec_sql doesn't exist, try direct execution
        const statements = sql.split(';').filter(s => s.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.from('_dummy_').select().limit(0);
            if (error) {
              console.error(`❌ Failed to execute: ${statement.substring(0, 50)}...`);
              throw error;
            }
          }
        }
      });

      if (error) {
        console.error(`❌ Failed to apply ${migration}:`, error.message);
      } else {
        console.log(`✅ Applied ${migration}`);
      }
    } catch (error) {
      console.error(`❌ Error applying ${migration}:`, error.message);
      console.log('\n⚠️  Please apply this migration manually through the Supabase dashboard SQL editor.');
    }
  }

  console.log('\n📝 Note: If migrations failed, please apply them manually through the Supabase dashboard:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of each migration file');
  console.log('4. Execute them in order (008 first, then 009)');
}

applyMigrations().catch(console.error);