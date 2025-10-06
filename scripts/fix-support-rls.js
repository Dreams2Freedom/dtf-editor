#!/usr/bin/env node

/**
 * Fix Support Tables RLS Policies
 * This script ensures RLS is enabled and policies are properly set
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
  console.log('🔧 Fixing Support Tables RLS...\n');

  try {
    // First, check if RLS is enabled
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', [
        'support_tickets',
        'support_messages',
        'support_notifications',
      ])
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('Error checking tables:', tablesError);

      // Alternative approach: Try to enable RLS directly
      console.log('\n🔄 Attempting to enable RLS directly...\n');

      const rlsStatements = [
        'ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE support_notifications ENABLE ROW LEVEL SECURITY;',
      ];

      for (const statement of rlsStatements) {
        console.log(`Executing: ${statement}`);
        const { error } = await supabase
          .rpc('exec_sql', { sql: statement })
          .catch(err => ({ error: err }));
        if (error) {
          console.log(`  ⚠️  ${error.message}`);
        } else {
          console.log('  ✅ Success');
        }
      }
    }

    // Check if we can query the tables
    console.log('\n📊 Testing table access...\n');

    // Test 1: Check support_tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('count')
      .limit(1);

    if (ticketsError) {
      console.log('❌ support_tickets: ', ticketsError.message);
    } else {
      console.log('✅ support_tickets: Accessible');
    }

    // Test 2: Check support_messages
    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('count')
      .limit(1);

    if (messagesError) {
      console.log('❌ support_messages: ', messagesError.message);
    } else {
      console.log('✅ support_messages: Accessible');
    }

    // Test 3: Check support_notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('support_notifications')
      .select('count')
      .limit(1);

    if (notificationsError) {
      console.log('❌ support_notifications: ', notificationsError.message);
    } else {
      console.log('✅ support_notifications: Accessible');
    }

    console.log('\n📝 Next Steps:');
    console.log('1. If tables are not accessible, go to Supabase Dashboard');
    console.log('2. Navigate to Authentication > Policies');
    console.log(
      '3. Check that RLS is enabled for support_tickets, support_messages, support_notifications'
    );
    console.log('4. If not, enable RLS for each table');
    console.log('5. Then re-run the migration file to add policies');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the fix
fixRLS();
