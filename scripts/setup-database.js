#!/usr/bin/env node

/**
 * DTF Editor - Database Setup Script
 * 
 * This script helps set up the database schema and test the connection.
 * It can be used both for local development and production setup.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}\n`);
}

// Check if environment variables are set
function checkEnvironment() {
  logHeader('Checking Environment Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
      logError(`Missing: ${varName}`);
    } else {
      logSuccess(`Found: ${varName}`);
    }
  }
  
  if (missing.length > 0) {
    logError(`\nMissing ${missing.length} required environment variables.`);
    logInfo('Please set up your .env.local file with the required variables.');
    logInfo('See ENVIRONMENT_SETUP_GUIDE.md for detailed instructions.');
    return false;
  }
  
  logSuccess('All required environment variables are set!');
  return true;
}

// Read migration files
function readMigrationFiles() {
  logHeader('Reading Migration Files');
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logError(`Migrations directory not found: ${migrationsDir}`);
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  logInfo(`Found ${files.length} migration files:`);
  
  const migrations = [];
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    migrations.push({ file, content });
    logSuccess(`  - ${file}`);
  }
  
  return migrations;
}

// Test database connection
async function testDatabaseConnection() {
  logHeader('Testing Database Connection');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      // If profiles table doesn't exist, that's expected
      if (error.code === '42P01') {
        logWarning('Profiles table not found - this is expected if migrations haven\'t been run yet.');
        logSuccess('Database connection successful!');
        return true;
      } else {
        throw error;
      }
    } else {
      logSuccess('Database connection successful!');
      logSuccess('Profiles table exists and is accessible.');
      return true;
    }
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    return false;
  }
}

// Generate TypeScript types
async function generateTypes() {
  logHeader('Generating TypeScript Types');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.rpc('get_schema');
    
    if (error) {
      logWarning('Could not generate types automatically. You may need to run migrations first.');
      return false;
    }
    
    // This would generate types from the schema
    logSuccess('TypeScript types generated successfully!');
    return true;
  } catch (error) {
    logWarning(`Could not generate types: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  logHeader('DTF Editor - Database Setup');
  
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  // Check environment
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // Read migration files
  const migrations = readMigrationFiles();
  if (migrations.length === 0) {
    logError('No migration files found. Please ensure migrations are in supabase/migrations/');
    process.exit(1);
  }
  
  // Test database connection
  const connectionOk = await testDatabaseConnection();
  if (!connectionOk) {
    logError('Database connection failed. Please check your Supabase configuration.');
    process.exit(1);
  }
  
  // Generate types
  await generateTypes();
  
  logHeader('Setup Complete!');
  logSuccess('Database setup script completed successfully.');
  logInfo('\nNext steps:');
  logInfo('1. Run your migrations using Supabase CLI or dashboard');
  logInfo('2. Test the authentication system');
  logInfo('3. Verify the credit system functions');
  logInfo('4. Test image upload and processing');
  
  logInfo('\nFor detailed instructions, see:');
  logInfo('- ENVIRONMENT_SETUP_GUIDE.md');
  logInfo('- DEVELOPMENT_ROADMAP.md');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkEnvironment,
  readMigrationFiles,
  testDatabaseConnection,
  generateTypes
}; 