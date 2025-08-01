#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTableAccess() {
  console.log('🔍 Testing table access via function...\n');
  
  try {
    // Test the function
    const { data, error } = await supabase.rpc('test_processed_images_access');
    
    if (error) {
      console.log('❌ Function call failed:', error);
    } else {
      console.log('✅ Function result:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testTableAccess();