#!/usr/bin/env node

// Test password reset email functionality

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const TEST_EMAIL = 'shannonherod@gmail.com';

async function testPasswordReset() {
  console.log('🔐 Testing Password Reset Email\n');
  console.log('   Email:', TEST_EMAIL);
  console.log('');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    console.log('📤 Requesting password reset...');
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(TEST_EMAIL, {
      redirectTo: 'https://dtfeditor.com/auth/reset-password',
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
      
      if (error.message.includes('not found')) {
        console.log('\n💡 User may not exist. Try signing up first at:');
        console.log('   https://dtfeditor.com/auth/signup');
      }
    } else {
      console.log('✅ Password reset email sent!');
      console.log('');
      console.log('📬 Check your inbox at:', TEST_EMAIL);
      console.log('   - Subject: "Reset Your Password"');
      console.log('   - From: noreply@dtfeditor.com (or Supabase)');
      console.log('   - Should arrive within 1-2 minutes');
      console.log('');
      console.log('📝 Note: Password reset emails are handled by Supabase Auth');
      console.log('   They may come from a Supabase email address.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
  
  console.log('\n🌐 Alternative: Test via Web Interface');
  console.log('   1. Go to https://dtfeditor.com/auth/login');
  console.log('   2. Click "Forgot your password?"');
  console.log('   3. Enter:', TEST_EMAIL);
  console.log('   4. Click "Send Reset Email"');
}

// Run the test
testPasswordReset().catch(console.error);