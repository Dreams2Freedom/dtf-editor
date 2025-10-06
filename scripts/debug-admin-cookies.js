const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Check if environment variables are loaded
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAdminAuth() {
  const email = 'Shannon@S2Transfers.com';

  console.log('🔍 Debugging Admin Authentication Issues');
  console.log('=====================================\n');

  try {
    // Check if user exists and has admin privileges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
      return;
    }

    if (!profile) {
      console.error('❌ No profile found for email:', email);
      return;
    }

    console.log('✅ User Profile Found:');
    console.log('  - ID:', profile.id);
    console.log('  - Email:', profile.email);
    console.log('  - Full Name:', profile.full_name);
    console.log('  - Is Admin:', profile.is_admin ? 'YES' : 'NO');
    console.log(
      '  - Credits:',
      profile.credits_remaining || profile.credits || 0
    );
    console.log('  - Plan:', profile.subscription_plan);
    console.log('  - Status:', profile.is_active ? 'Active' : 'Inactive');
    console.log('  - Created:', profile.created_at);
    console.log('  - Last Activity:', profile.last_activity_at);

    if (!profile.is_admin) {
      console.error('\n❌ User does not have admin privileges!');
      console.log('   Run: node scripts/create-simple-admin.js');
      return;
    }

    // Check if admin tables exist
    console.log('\n🔍 Checking Admin Tables...');

    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', profile.id);

    if (adminError) {
      console.log('⚠️  Admin tables not found or not accessible');
      console.log('   This is expected if using simple is_admin flag');
    } else if (adminUsers && adminUsers.length > 0) {
      console.log('✅ User found in admin_users table');
    }

    console.log('\n📋 Authentication Flow:');
    console.log('1. User logs in via /admin/login');
    console.log('2. API validates credentials with Supabase Auth');
    console.log('3. API checks is_admin flag in profiles table');
    console.log('4. API creates admin_session cookie');
    console.log('5. Middleware checks for admin_session cookie');
    console.log('6. Dashboard verifies session from localStorage/cookie');

    console.log('\n⚠️  Common Issues:');
    console.log('- Cookie not being set properly (Next.js 15 issue)');
    console.log('- Cookie domain/path mismatch');
    console.log('- Middleware not reading cookies correctly');
    console.log('- Session stored in localStorage but not cookie');

    console.log('\n🔧 Debug Steps:');
    console.log('1. Check browser DevTools > Application > Cookies');
    console.log('2. Look for admin_session cookie after login');
    console.log('3. Check Network tab for Set-Cookie headers');
    console.log('4. Verify cookie httpOnly and secure flags');
    console.log('5. Check if running on http vs https (secure flag)');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the debug script
debugAdminAuth();
