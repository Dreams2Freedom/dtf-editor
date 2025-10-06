const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  try {
    // Check if credit_transactions table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%credit%');

    console.log('Tables with "credit" in name:', tables);

    // Check functions
    const { data: functions, error: funcError } = await supabase
      .rpc('pg_get_functiondef', { funcid: 0 })
      .select('*');

    console.log('Functions error:', funcError);

    // Try to check if add_user_credits exists by calling it with dummy data
    console.log('\nTesting add_user_credits function...');
    const { data: testData, error: testError } = await supabase.rpc(
      'add_user_credits',
      {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 0,
        p_transaction_type: 'test',
        p_description: 'test',
      }
    );

    if (testError) {
      console.log('add_user_credits error:', testError.message);
    } else {
      console.log('add_user_credits exists and returned:', testData);
    }

    // Check profiles table structure
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .order('ordinal_position');

    console.log(
      '\nProfiles table columns:',
      columns?.map(c => c.column_name).join(', ')
    );
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
