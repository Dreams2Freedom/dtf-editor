#!/usr/bin/env node

// 🗄️ DTF Editor - Clear Database Script
// This script clears all data from the Supabase database

require('dotenv').config();
const { Pool } = require('pg');

async function clearDatabase() {
  console.log('🗄️ DTF Editor - Clear Database');
  console.log('==============================');
  console.log('');

  try {
    // Check if we have database connection
    if (!process.env.SUPABASE_DB_URL) {
      console.log('❌ SUPABASE_DB_URL not found in environment variables');
      console.log('💡 Please set your Supabase database URL');
      return;
    }

    // Create database connection
    const pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
    });

    console.log('🗄️ Connecting to Supabase database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');
    console.log('');

    // Get list of all tables
    console.log('📋 Getting list of tables...');
    const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`  - ${table}`));
    console.log('');

    // Confirm before clearing
    console.log('⚠️  WARNING: This will delete ALL data from ALL tables!');
    console.log('📋 Tables to be cleared:');
    tables.forEach(table => console.log(`  - ${table}`));
    console.log('');

    // For safety, let's just show what would be cleared
    console.log('🔍 Checking current data...');

    for (const table of tables) {
      try {
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM "${table}"`
        );
        const count = countResult.rows[0].count;
        console.log(`  - ${table}: ${count} records`);
      } catch (error) {
        console.log(`  - ${table}: Error checking count`);
      }
    }
    console.log('');

    console.log('💡 To actually clear the database, you can:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run these commands:');
    console.log('');

    // Generate SQL commands to clear all tables
    console.log('-- SQL Commands to clear database:');
    console.log('-- (Run these in Supabase SQL Editor)');
    console.log('');

    // Disable foreign key checks and clear tables
    console.log('-- Disable foreign key checks');
    console.log('SET session_replication_role = replica;');
    console.log('');

    for (const table of tables) {
      console.log(`-- Clear ${table} table`);
      console.log(`TRUNCATE TABLE "${table}" CASCADE;`);
    }

    console.log('');
    console.log('-- Re-enable foreign key checks');
    console.log('SET session_replication_role = DEFAULT;');
    console.log('');

    client.release();
    await pool.end();

    console.log('✅ Database analysis complete');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Run the SQL commands above');
    console.log('5. Confirm the database is cleared');
  } catch (error) {
    console.error('❌ Database clear failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
clearDatabase().catch(console.error);
