#!/usr/bin/env node

// Test the welcome email API endpoint

const TEST_EMAIL = 'shannonherod@gmail.com';

async function testWelcomeEmailAPI() {
  console.log('🔄 Testing Welcome Email API...\n');
  console.log('   Endpoint: /api/auth/welcome-email');
  console.log('   Method: POST');
  console.log('   Target Email:', TEST_EMAIL);
  console.log('');
  
  try {
    // First, we need to get an auth token
    // For testing, we'll simulate this with a direct database query
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Check if user exists
    console.log('📋 Checking if user exists...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, subscription_plan')
      .eq('email', TEST_EMAIL)
      .single();
    
    if (profileError || !profile) {
      console.log('⚠️  User not found. Creating test user...');
      
      // Create a test user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        email_confirm: true,
        user_metadata: {
          first_name: 'Shannon',
          last_name: 'Test'
        }
      });
      
      if (authError) {
        console.error('❌ Failed to create test user:', authError.message);
        return;
      }
      
      console.log('✅ Test user created:', authData.user.id);
      
      // Create profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: TEST_EMAIL,
          first_name: 'Shannon',
          last_name: 'Test',
          subscription_plan: 'free',
          credits_remaining: 2
        });
      
      if (insertError) {
        console.error('❌ Failed to create profile:', insertError.message);
      }
    } else {
      console.log('✅ User found:', profile.email);
      console.log('   Name:', profile.first_name || 'Not set');
      console.log('   Plan:', profile.subscription_plan || 'free');
    }
    
    // Now send the welcome email using the service
    console.log('\n📧 Sending welcome email directly...');
    
    const { EmailService } = require('../src/services/email.ts');
    const emailService = new EmailService();
    
    const sent = await emailService.sendWelcomeEmail({
      email: TEST_EMAIL,
      firstName: profile?.first_name || 'Shannon',
      planName: profile?.subscription_plan || 'Free'
    });
    
    if (sent) {
      console.log('✅ Welcome email sent successfully!');
      console.log('');
      console.log('📬 Check your inbox at:', TEST_EMAIL);
      console.log('   - Look for "Welcome to DTF Editor!"');
      console.log('   - From: noreply@dtfeditor.com');
      console.log('   - Should arrive within 1-2 minutes');
    } else {
      console.log('❌ Failed to send welcome email');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Note: This script needs to be run from the project root directory');
  }
  
  console.log('\n📝 Alternative: Test via CURL');
  console.log('   If you\'re logged in as this user, you can test with:');
  console.log('   curl -X POST https://dtfeditor.com/api/auth/welcome-email \\');
  console.log('     -H "Cookie: [your-session-cookie]" \\');
  console.log('     -H "Content-Type: application/json"');
}

// Run the test
testWelcomeEmailAPI().catch(console.error);