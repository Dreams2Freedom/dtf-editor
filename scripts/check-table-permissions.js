#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTablePermissions() {
  console.log('🔍 Checking table permissions...\n');

  try {
    // 1. Check if we can query information_schema
    console.log('1️⃣ Checking table existence in information_schema...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_name', 'processed_images')
      .single();

    if (tableError) {
      console.log('❌ Cannot query information_schema:', tableError.message);
    } else {
      console.log('✅ Table info:', tableInfo);
    }

    // 2. Try a simple count query
    console.log('\n2️⃣ Trying simple count query...');
    const { count, error: countError } = await supabase
      .from('processed_images')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Count failed:', countError.message);
    } else {
      console.log('✅ Table has', count, 'rows');
    }

    // 3. Check current role
    console.log('\n3️⃣ Checking current database role...');
    const { data: roleData, error: roleError } =
      await supabase.rpc('current_user');

    if (roleError) {
      console.log('❌ Role check failed:', roleError.message);
    } else {
      console.log('✅ Current role:', roleData);
    }

    // 4. Try raw SQL
    console.log('\n4️⃣ Trying raw SQL query...');
    const { data: sqlData, error: sqlError } = await supabase.rpc(
      'query_processed_images',
      {}
    );

    if (sqlError) {
      console.log('❌ Raw SQL failed:', sqlError.message);
      console.log("   (This is expected if the function doesn't exist)");
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTablePermissions();
