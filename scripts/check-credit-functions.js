const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFunctions() {
  try {
    // Check if add_credit_purchase exists
    const { data: functions } = await supabase
      .from('pg_proc')
      .select('proname')
      .like('proname', '%credit%');

    console.log('Credit-related functions:', functions);

    // Try to check credit_transactions table structure
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'credit_transactions');

    console.log('\nCredit transactions columns:', columns);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFunctions();
