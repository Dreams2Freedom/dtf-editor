#!/usr/bin/env node

/**
 * Debug Support Ticket Creation
 * This script tests the support ticket creation process step by step
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create client with anon key (as a regular user would)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugTicketCreation() {
  console.log('🔍 Debug Support Ticket Creation\n');

  try {
    // Step 1: Check if we're authenticated
    console.log('1️⃣ Checking authentication...');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        '❌ Not authenticated:',
        userError?.message || 'No user found'
      );
      console.log('\n💡 Try logging in first through the web app');
      return;
    }

    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);

    // Step 2: Check if user exists in profiles table
    console.log('\n2️⃣ Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError.message);
    } else {
      console.log('✅ Profile found:', profile.email);
    }

    // Step 3: Test RLS - can we SELECT from support_tickets?
    console.log('\n3️⃣ Testing SELECT permission on support_tickets...');
    const { data: tickets, error: selectError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id);

    if (selectError) {
      console.error(
        '❌ Cannot SELECT from support_tickets:',
        selectError.message
      );
    } else {
      console.log('✅ Can SELECT from support_tickets');
      console.log('   Existing tickets:', tickets?.length || 0);
    }

    // Step 4: Test INSERT without ticket_number (should auto-generate)
    console.log('\n4️⃣ Testing INSERT permission (without ticket_number)...');
    const testData = {
      user_id: user.id,
      subject: 'Test ticket from debug script',
      category: 'technical',
      priority: 'medium',
    };

    console.log('   Inserting:', JSON.stringify(testData, null, 2));

    const { data: newTicket, error: insertError } = await supabase
      .from('support_tickets')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.error(
        '❌ Cannot INSERT into support_tickets:',
        insertError.message
      );
      console.error('   Error code:', insertError.code);
      console.error('   Error details:', insertError.details);

      // Step 5: Try with explicit ticket_number
      console.log('\n5️⃣ Testing INSERT with explicit ticket_number...');
      const testDataWithNumber = {
        ...testData,
        ticket_number: `DBG-${Date.now()}`,
      };

      const { data: newTicket2, error: insertError2 } = await supabase
        .from('support_tickets')
        .insert(testDataWithNumber)
        .select()
        .single();

      if (insertError2) {
        console.error('❌ Still cannot INSERT:', insertError2.message);
      } else {
        console.log(
          '✅ Created ticket with explicit number:',
          newTicket2.ticket_number
        );

        // Clean up test ticket
        await supabase.from('support_tickets').delete().eq('id', newTicket2.id);
        console.log('   (Test ticket deleted)');
      }
    } else {
      console.log('✅ Created ticket:', newTicket.ticket_number);

      // Step 6: Test adding a message
      console.log('\n6️⃣ Testing message creation...');
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: newTicket.id,
          user_id: user.id,
          message: 'Test message',
          is_admin: false,
        });

      if (messageError) {
        console.error('❌ Cannot create message:', messageError.message);
      } else {
        console.log('✅ Message created successfully');
      }

      // Clean up test ticket
      await supabase.from('support_tickets').delete().eq('id', newTicket.id);
      console.log('   (Test ticket deleted)');
    }

    // Step 7: Check RLS policies
    console.log('\n7️⃣ Checking RLS configuration...');
    console.log(
      '   To verify RLS is enabled, run this in Supabase SQL Editor:'
    );
    console.log(
      "   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'support_tickets';"
    );
    console.log('\n   To see all policies:');
    console.log(
      "   SELECT * FROM pg_policies WHERE tablename = 'support_tickets';"
    );
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the debug
debugTicketCreation();
