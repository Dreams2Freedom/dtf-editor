/**
 * Check if shannon@s2transfers.com is an admin
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkS2TransfersAdmin() {
  console.log('🔍 Checking shannon@s2transfers.com admin status...\n');

  try {
    // Get all users
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    // Find shannon@s2transfers.com
    const s2User = users.users.find(u => u.email === 'shannon@s2transfers.com');

    if (!s2User) {
      console.log('❌ shannon@s2transfers.com not found in auth.users');
      console.log('Available users:', users.users.map(u => u.email).join(', '));
      return;
    }

    console.log(`✅ Found user: ${s2User.email}`);
    console.log(`   User ID: ${s2User.id}\n`);

    // Test is_admin function for this user
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin', { user_id: s2User.id });

    if (adminError) {
      console.log('❌ is_admin function error:', adminError.message);
      return;
    }

    console.log(`is_admin(${s2User.email}): ${isAdmin}\n`);

    if (!isAdmin) {
      console.log('⚠️  User is NOT an admin. Need to run migration:\n');
      console.log('Copy this SQL to Supabase Dashboard > SQL Editor:\n');
      console.log(`
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email IN (
        'shannon@s2transfers.com',
        'shannonherod@gmail.com',
        'admin@dtfeditor.com'
      )
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
    } else {
      console.log('✅ User IS an admin!\n');

      // Now test if the user can actually access affiliates
      console.log('Testing affiliates table access as service role...');
      const { data: affiliates, error: affError } = await supabase
        .from('affiliates')
        .select('id, referral_code, status')
        .limit(5);

      if (affError) {
        console.log('❌ Error accessing affiliates:', affError.message);
      } else {
        console.log(`✅ Can access affiliates table: ${affiliates.length} records found`);
        if (affiliates.length > 0) {
          affiliates.forEach(aff => {
            console.log(`   - ${aff.referral_code}: ${aff.status}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkS2TransfersAdmin();
