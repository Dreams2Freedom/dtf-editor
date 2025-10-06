/**
 * Script to create missing profile entries for users
 * This ensures the admin dashboard can display user information
 * Run: node scripts/create-missing-profiles.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMissingProfiles() {
  console.log('🔧 Creating missing profiles...\n');

  try {
    // Get all auth users
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      return;
    }

    const users = authData?.users || [];
    console.log(`Found ${users.length} total users in auth\n`);

    let created = 0;
    let existing = 0;
    let failed = 0;

    for (const user of users) {
      // Check if profile exists
      const { data: profile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log(`Creating profile for ${user.email}...`);

        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name:
            user.user_metadata?.full_name || user.user_metadata?.name || null,
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error(
            `  ❌ Failed to create profile for ${user.email}:`,
            insertError.message
          );
          failed++;
        } else {
          console.log(`  ✅ Created profile for ${user.email}`);
          created++;
        }
      } else if (profile) {
        existing++;
      } else if (checkError) {
        console.error(
          `Error checking profile for ${user.email}:`,
          checkError.message
        );
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Created: ${created} profiles`);
    console.log(`  ⏭️  Existing: ${existing} profiles`);
    console.log(`  ❌ Failed: ${failed} profiles`);
    console.log(`  📋 Total: ${users.length} users`);

    // Now check affiliates again
    console.log('\n🔍 Checking affiliates with profiles:');
    const { data: affiliates } = await supabase.from('affiliates').select(`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `);

    if (affiliates && affiliates.length > 0) {
      affiliates.forEach(aff => {
        console.log(
          `  ${aff.referral_code}: ${aff.profiles?.email || 'No profile'}`
        );
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }

  console.log('\n✨ Done!');
}

createMissingProfiles();
