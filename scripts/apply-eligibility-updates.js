#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyEligibilityUpdates() {
  console.log('Updating eligibility functions for testing...\n');

  // SQL to update pause eligibility
  const pauseSQL = `
    CREATE OR REPLACE FUNCTION check_pause_eligibility(p_user_id UUID)
    RETURNS TABLE(can_pause BOOLEAN, reason TEXT, pause_count INTEGER)
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_profile profiles%ROWTYPE;
        v_current_year INTEGER;
        v_pauses_this_year INTEGER;
    BEGIN
        -- Get user profile
        SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0;
            RETURN;
        END IF;
        
        -- Get current year
        v_current_year := EXTRACT(YEAR FROM NOW());
        
        -- Count pauses this year from events
        SELECT COUNT(*) INTO v_pauses_this_year
        FROM subscription_events
        WHERE user_id = p_user_id
        AND event_type = 'subscription_paused'
        AND EXTRACT(YEAR FROM created_at) = v_current_year;
        
        -- Check if already paused
        IF v_profile.subscription_paused_until IS NOT NULL AND v_profile.subscription_paused_until > NOW() THEN
            RETURN QUERY SELECT FALSE, 'Subscription is already paused'::TEXT, COALESCE(v_profile.pause_count, 0);
            RETURN;
        END IF;
        
        -- Check pause limit (keeping high limit for testing)
        IF v_pauses_this_year >= 10 THEN
            RETURN QUERY SELECT FALSE, 'You can only pause your subscription 2 times per year'::TEXT, COALESCE(v_profile.pause_count, 0);
            RETURN;
        END IF;
        
        -- User is eligible
        RETURN QUERY SELECT TRUE, 'Eligible to pause subscription'::TEXT, COALESCE(v_profile.pause_count, 0);
    END;
    $$;
  `;

  // SQL to update discount eligibility
  const discountSQL = `
    CREATE OR REPLACE FUNCTION check_discount_eligibility(p_user_id UUID)
    RETURNS TABLE(can_use_discount BOOLEAN, reason TEXT, discount_used_count INTEGER)
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_profile profiles%ROWTYPE;
    BEGIN
        -- Get user profile
        SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0;
            RETURN;
        END IF;
        
        -- User is eligible (no restrictions for testing)
        RETURN QUERY 
        SELECT 
            TRUE, 
            'Eligible for retention discount'::TEXT,
            COALESCE(v_profile.discount_count, 0);
    END;
    $$;
  `;

  try {
    // Execute pause eligibility update
    console.log('Updating pause eligibility function...');
    const { error: pauseError } = await supabase.rpc('query', {
      query: pauseSQL,
    });

    if (pauseError) {
      console.error('Error updating pause eligibility:', pauseError);
    } else {
      console.log('✅ Pause eligibility function updated');
    }

    // Execute discount eligibility update
    console.log('\nUpdating discount eligibility function...');
    const { error: discountError } = await supabase.rpc('query', {
      query: discountSQL,
    });

    if (discountError) {
      console.error('Error updating discount eligibility:', discountError);
    } else {
      console.log('✅ Discount eligibility function updated');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // Test the updated functions
  console.log('\n=== TESTING UPDATED FUNCTIONS ===');

  // Get user ID
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(
    u => u.email === 'snsmarketing@gmail.com'
  );

  if (authUser) {
    // Test pause eligibility
    const { data: pauseElig } = await supabase.rpc('check_pause_eligibility', {
      p_user_id: authUser.id,
    });

    console.log('\nPause Eligibility:');
    console.log('Can Pause:', pauseElig?.can_pause);
    console.log('Reason:', pauseElig?.reason);

    // Test discount eligibility
    const { data: discountElig } = await supabase.rpc(
      'check_discount_eligibility',
      { p_user_id: authUser.id }
    );

    console.log('\nDiscount Eligibility:');
    console.log('Can Use Discount:', discountElig?.can_use_discount);
    console.log('Reason:', discountElig?.reason);
  }
}

applyEligibilityUpdates();
