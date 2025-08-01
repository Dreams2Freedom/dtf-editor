#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFunction() {
  console.log('📦 Applying credit adjustment function...\n');
  
  try {
    const sqlPath = path.join(__dirname, 'create-credit-adjustment-function.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    console.log('🔄 Creating adjust_user_credits function...');
    
    // Note: Direct SQL execution through Supabase client is limited
    // We'll output the SQL for manual execution
    console.log('\n⚠️  Please run the following SQL in your Supabase dashboard:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('\n--- START SQL ---');
    console.log(sql);
    console.log('--- END SQL ---\n');
    
    console.log('4. Click "Run" to execute the SQL');
    console.log('\nThis function will enable credit adjustments for plan changes.');
    
  } catch (error) {
    console.error('❌ Error reading SQL file:', error.message);
  }
}

applyFunction().catch(console.error);