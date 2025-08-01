#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUpscaleAPI() {
  console.log('Testing upscale API...\n');

  // First, get a test user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, email, credits_remaining')
    .gt('credits_remaining', 0)
    .limit(1);

  if (userError || !users?.length) {
    console.error('No users with credits found');
    return;
  }

  const user = users[0];
  console.log(`Testing with user: ${user.email}`);
  console.log(`Current credits: ${user.credits_remaining}\n`);

  // Test credit deduction function directly
  try {
    console.log('Testing credit deduction function...');
    const { data, error } = await supabase.rpc('use_credits_with_expiration', {
      p_user_id: user.id,
      p_credits_to_use: 1,
      p_operation: 'test-upscale'
    });

    if (error) {
      console.error('❌ Credit deduction failed:', error.message);
      console.error('Full error:', error);
    } else if (!data || !data[0]?.success) {
      console.error('❌ Credit deduction returned false - insufficient credits');
    } else {
      console.log('✅ Credit deduction successful!');
      console.log('Remaining credits:', data[0].remaining_credits);
      
      // Refund the credit
      const { error: refundError } = await supabase.rpc('add_credit_transaction', {
        p_user_id: user.id,
        p_amount: 1,
        p_type: 'refund',
        p_description: 'Test refund',
        p_metadata: { reason: 'api_test' }
      });
      
      if (refundError) {
        console.error('Refund failed:', refundError.message);
      } else {
        console.log('✅ Credit refunded');
      }
    }
  } catch (err) {
    console.error('Error during test:', err.message);
  }

  // Check the actual error from imageProcessing
  console.log('\nChecking Deep-Image API configuration...');
  console.log('API Key exists:', !!process.env.DEEP_IMAGE_API_KEY);
  console.log('API URL:', process.env.DEEP_IMAGE_API_URL || 'https://api.deep-image.ai/rest_api');
}

testUpscaleAPI();