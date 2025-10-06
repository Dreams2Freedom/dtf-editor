/**
 * Script to check affiliate data in the database
 * Run: node scripts/check-affiliate-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAffiliateData() {
  console.log('🔍 Checking Affiliate Data...\n');

  try {
    // 1. Check all affiliates
    console.log('1. Checking affiliates table:');
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('*');

    if (affiliatesError) {
      console.error('Error fetching affiliates:', affiliatesError);
    } else {
      console.log(`   Found ${affiliates?.length || 0} affiliate(s)`);
      if (affiliates && affiliates.length > 0) {
        affiliates.forEach(aff => {
          console.log(
            `   - ${aff.referral_code}: Status=${aff.status}, User=${aff.user_id}`
          );
        });
      }
    }

    // 2. Check profiles table
    console.log('\n2. Checking profiles table:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      console.log(
        '   Profiles table might not exist or have different structure'
      );
    } else {
      console.log(`   Found ${profiles?.length || 0} profile(s)`);
      if (profiles && profiles.length > 0) {
        profiles.forEach(prof => {
          console.log(`   - ${prof.email}: ${prof.full_name || 'No name'}`);
        });
      }
    }

    // 3. Check if we can find the specific user
    console.log('\n3. Looking for snsmarketing@gmail.com:');
    const { data: authUser, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
    } else {
      const snsUser = authUser?.users?.find(
        u => u.email === 'snsmarketing@gmail.com'
      );
      if (snsUser) {
        console.log(`   Found user in auth: ID=${snsUser.id}`);

        // Check if this user has an affiliate record
        const { data: snsAffiliate } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', snsUser.id)
          .single();

        if (snsAffiliate) {
          console.log(
            '   ✅ User has affiliate record:',
            snsAffiliate.referral_code
          );
        } else {
          console.log('   ❌ No affiliate record found for this user');
        }
      } else {
        console.log('   User not found in auth');
      }
    }

    // 4. Check if profiles table exists and has correct structure
    console.log('\n4. Checking table structure:');
    const { data: tables } = await supabase
      .rpc('to_jsonb', { input: null })
      .limit(1);

    // Try a simple query to see if profiles table works
    const { error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('   ⚠️  Profiles table issue:', testError.message);
      console.log('   You may need to create a profiles table or view');
    } else {
      console.log('   ✅ Profiles table is accessible');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }

  console.log('\n✨ Check complete!');
}

checkAffiliateData();
