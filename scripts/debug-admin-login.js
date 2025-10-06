#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAdminLogin() {
  console.log('🔍 Admin Login Debug Script\n');

  // Check environment
  console.log('1. Environment Check:');
  console.log('   - NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log(
    '   - Supabase URL:',
    process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'
  );
  console.log(
    '   - Service Key:',
    process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'
  );
  console.log('');

  // Check admin users
  console.log('2. Admin Users:');
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_admin, created_at, last_activity_at')
    .eq('is_admin', true);

  if (adminError) {
    console.error('   ❌ Error fetching admins:', adminError.message);
  } else if (!admins || admins.length === 0) {
    console.log('   ⚠️  No admin users found');
  } else {
    console.log(`   ✅ Found ${admins.length} admin user(s):`);
    admins.forEach(admin => {
      console.log(`      - ${admin.email} (${admin.full_name || 'No name'})`);
      console.log(`        ID: ${admin.id}`);
      console.log(
        `        Created: ${new Date(admin.created_at).toLocaleString()}`
      );
      console.log(
        `        Last activity: ${admin.last_activity_at ? new Date(admin.last_activity_at).toLocaleString() : 'Never'}`
      );
    });
  }
  console.log('');

  // Check auth sessions
  console.log('3. Active Auth Sessions:');
  const {
    data: { sessions },
    error: sessionError,
  } = await supabase.auth.admin.listUsers();

  if (sessionError) {
    console.error('   ❌ Error fetching sessions:', sessionError.message);
  } else {
    const activeSessions = sessions?.filter(user => user.last_sign_in_at) || [];
    if (activeSessions.length === 0) {
      console.log('   ⚠️  No active sessions found');
    } else {
      console.log(
        `   ✅ Found ${activeSessions.length} user(s) with sessions:`
      );
      activeSessions.forEach(user => {
        console.log(`      - ${user.email}`);
        console.log(
          `        Last sign in: ${new Date(user.last_sign_in_at).toLocaleString()}`
        );
      });
    }
  }
  console.log('');

  // Test admin authentication
  console.log('4. Test Admin Authentication:');
  const testEmail = process.argv[2];
  const testPassword = process.argv[3];

  if (testEmail && testPassword) {
    console.log(`   Testing login for: ${testEmail}`);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

    if (authError) {
      console.error('   ❌ Authentication failed:', authError.message);
    } else if (authData.user) {
      console.log('   ✅ Authentication successful!');
      console.log(`      User ID: ${authData.user.id}`);
      console.log(
        `      Session expires: ${new Date(authData.session.expires_at * 1000).toLocaleString()}`
      );

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .single();

      console.log(`      Is admin: ${profile?.is_admin ? '✅ Yes' : '❌ No'}`);

      // Sign out
      await supabase.auth.signOut();
    }
  } else {
    console.log(
      '   ℹ️  To test authentication, run: node scripts/debug-admin-login.js <email> <password>'
    );
  }
  console.log('');

  // Check cookie configuration
  console.log('5. Cookie Configuration (from code):');
  console.log('   - HttpOnly: true');
  console.log(
    '   - Secure:',
    process.env.NODE_ENV === 'production' ? 'true' : 'false'
  );
  console.log('   - SameSite: lax');
  console.log('   - Path: /');
  console.log('');

  // Recommendations
  console.log('6. Debugging Steps:');
  console.log('   1. Open browser DevTools → Network tab');
  console.log('   2. Clear all cookies for localhost:3000');
  console.log('   3. Try logging in again');
  console.log('   4. Check the /api/admin/auth/login response:');
  console.log('      - Status should be 200');
  console.log('      - Response Headers should have Set-Cookie');
  console.log('   5. Check Application → Cookies in DevTools');
  console.log('      - Look for admin_session cookie');
  console.log('   6. Try navigating directly to /admin after login');
  console.log('');

  console.log('7. Common Issues:');
  console.log('   - Cookie blocked by browser (check console for warnings)');
  console.log('   - JavaScript redirect blocked by extension');
  console.log('   - Middleware not passing through requests');
  console.log('   - Client-side hydration errors');
}

debugAdminLogin().catch(console.error);
