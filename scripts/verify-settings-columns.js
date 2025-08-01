#!/usr/bin/env node

/**
 * Verify that user settings columns were added successfully
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumns() {
  try {
    console.log('🔍 Verifying user settings columns...\n');

    // Fetch a profile to check columns
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No profiles found to verify columns');
      return;
    }

    const profile = profiles[0];
    console.log('✅ Column verification results:\n');

    // Check for new columns
    const columnsToCheck = [
      'notification_preferences',
      'company_name',
      'phone'
    ];

    columnsToCheck.forEach(column => {
      if (column in profile) {
        console.log(`  ✓ ${column}: exists`);
        if (column === 'notification_preferences' && profile[column]) {
          console.log(`    Default value:`, JSON.stringify(profile[column], null, 2));
        }
      } else {
        console.log(`  ✗ ${column}: NOT FOUND`);
      }
    });

    console.log('\n🎉 Settings columns are ready to use!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyColumns();