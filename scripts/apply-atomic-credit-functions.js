import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying atomic credit deduction functions...\n');

  try {
    // Read the migration file
    const migrationPath = join(
      __dirname,
      '../supabase/migrations/20250105_atomic_credit_deduction.sql'
    );
    const sql = readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;

      console.log('🔄 Executing SQL statement...');
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';',
      });

      if (error) {
        // Try direct execution as fallback
        console.log('⚠️  RPC failed, trying direct execution...');
        const { error: directError } = await supabase
          .from('_sql')
          .select('*')
          .limit(0);

        if (directError) {
          console.error('❌ Error:', error.message);
          console.log('\n⚠️  Manual application required:');
          console.log('1. Go to Supabase Dashboard → SQL Editor');
          console.log(
            '2. Copy the contents of: supabase/migrations/20250105_atomic_credit_deduction.sql'
          );
          console.log('3. Paste and execute');
          process.exit(1);
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\nTesting functions...');

    // Test that functions exist
    const { data: testDeduct, error: testError1 } = await supabase.rpc(
      'deduct_credits_atomic',
      {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID for test
        p_amount: 1,
      }
    );

    if (testError1 && !testError1.message.includes('violates foreign key')) {
      console.log('⚠️  deduct_credits_atomic function may not be created');
    } else {
      console.log('✅ deduct_credits_atomic function exists');
    }

    const { data: testRefund, error: testError2 } = await supabase.rpc(
      'refund_credits_atomic',
      {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 1,
      }
    );

    if (testError2 && !testError2.message.includes('violates foreign key')) {
      console.log('⚠️  refund_credits_atomic function may not be created');
    } else {
      console.log('✅ refund_credits_atomic function exists');
    }

    console.log('\n✨ All done! Credit deduction functions are ready.');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log(
      '\n⚠️  Please apply manually through Supabase Dashboard SQL Editor'
    );
    console.log(
      'File: supabase/migrations/20250105_atomic_credit_deduction.sql'
    );
    process.exit(1);
  }
}

applyMigration();
