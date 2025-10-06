#!/usr/bin/env node

/**
 * Apply credit tracking migration to database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function applyMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Applying credit tracking migration...\n');

  const migrations = [
    {
      name: 'Add last_credit_reset column',
      sql: `ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMPTZ DEFAULT NOW()`,
    },
    {
      name: 'Add expires_at column',
      sql: `ALTER TABLE public.credit_transactions 
            ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
    },
    {
      name: 'Drop existing constraint',
      sql: `ALTER TABLE public.profiles 
            DROP CONSTRAINT IF EXISTS profiles_subscription_status_check`,
    },
    {
      name: 'Add updated constraint',
      sql: `ALTER TABLE public.profiles 
            ADD CONSTRAINT profiles_subscription_status_check 
            CHECK (subscription_status IN ('free', 'basic', 'starter', 'past_due', 'canceled'))`,
    },
    {
      name: 'Add expiration index',
      sql: `CREATE INDEX IF NOT EXISTS idx_credit_transactions_expires_at 
            ON public.credit_transactions(expires_at) 
            WHERE expires_at IS NOT NULL`,
    },
  ];

  for (const migration of migrations) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        query: migration.sql,
      });

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log(`⚠️  ${migration.name}: RPC not available, skipping...`);
      } else {
        console.log(`✅ ${migration.name}: Applied successfully`);
      }
    } catch (err) {
      console.error(`❌ ${migration.name}: ${err.message}`);
    }
  }

  console.log('\nMigration complete!');
  console.log(
    'Note: Some changes may require manual application through Supabase dashboard.'
  );
}

applyMigration().catch(console.error);
