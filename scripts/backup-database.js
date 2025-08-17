#!/usr/bin/env node

/**
 * Database Backup Script for Supabase
 * 
 * This script creates backups of your Supabase database
 * Run manually or via cron job for automated backups
 * 
 * Usage:
 *   node scripts/backup-database.js
 *   
 * For automated backups, add to cron:
 *   0 2 * * * cd /path/to/project && node scripts/backup-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 30; // Keep last 30 backups
const TABLES_TO_BACKUP = [
  'profiles',
  'credit_transactions',
  'processed_images',
  'support_tickets',
  'support_messages',
  'audit_logs',
  'admin_actions',
  'email_notifications',
  'storage_analytics',
  'user_settings'
];

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
  }
}

// Create Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Export table data to JSON
async function exportTable(supabase, tableName) {
  try {
    console.log(`  📊 Exporting ${tableName}...`);
    
    // Fetch all data from table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`  ❌ Error exporting ${tableName}:`, error.message);
      return null;
    }
    
    console.log(`  ✅ Exported ${data.length} rows from ${tableName}`);
    return {
      table: tableName,
      rowCount: data.length,
      data: data
    };
  } catch (error) {
    console.error(`  ❌ Failed to export ${tableName}:`, error.message);
    return null;
  }
}

// Create backup
async function createBackup() {
  console.log('\n🔄 Starting database backup...\n');
  
  try {
    await ensureBackupDir();
    
    const supabase = getSupabaseClient();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // Export all tables
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      database: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tables: {}
    };
    
    for (const tableName of TABLES_TO_BACKUP) {
      const tableData = await exportTable(supabase, tableName);
      if (tableData) {
        backup.tables[tableName] = tableData;
      }
    }
    
    // Calculate backup statistics
    const totalRows = Object.values(backup.tables).reduce(
      (sum, table) => sum + (table?.rowCount || 0), 
      0
    );
    
    backup.statistics = {
      totalTables: Object.keys(backup.tables).length,
      totalRows: totalRows,
      backupSize: JSON.stringify(backup).length
    };
    
    // Write backup to file
    await fs.writeFile(
      backupPath, 
      JSON.stringify(backup, null, 2),
      'utf8'
    );
    
    console.log('\n📦 Backup Summary:');
    console.log(`  📁 File: ${backupFileName}`);
    console.log(`  📊 Tables: ${backup.statistics.totalTables}`);
    console.log(`  📝 Total Rows: ${backup.statistics.totalRows}`);
    console.log(`  💾 Size: ${(backup.statistics.backupSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Compress backup
    const compressedPath = `${backupPath}.gz`;
    try {
      await execPromise(`gzip -c ${backupPath} > ${compressedPath}`);
      await fs.unlink(backupPath); // Remove uncompressed file
      console.log(`  🗜️  Compressed backup created`);
    } catch (error) {
      console.log('  ⚠️  Could not compress backup (gzip not available)');
    }
    
    // Clean up old backups
    await cleanupOldBackups();
    
    console.log('\n✅ Backup completed successfully!\n');
    return backupPath;
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Clean up old backups
async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('backup_'))
      .sort()
      .reverse();
    
    if (backupFiles.length > MAX_BACKUPS) {
      const filesToDelete = backupFiles.slice(MAX_BACKUPS);
      
      for (const file of filesToDelete) {
        await fs.unlink(path.join(BACKUP_DIR, file));
        console.log(`  🗑️  Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('  ⚠️  Error cleaning up old backups:', error.message);
  }
}

// Restore from backup (utility function)
async function restoreFromBackup(backupFile) {
  console.log('\n⚠️  RESTORE FUNCTIONALITY\n');
  console.log('To restore from a backup:');
  console.log('1. Review the backup file carefully');
  console.log('2. Use Supabase Dashboard or SQL Editor');
  console.log('3. Import data table by table');
  console.log('4. Verify data integrity after restore\n');
  console.log('Automatic restore is not implemented to prevent accidental data loss.\n');
}

// List available backups
async function listBackups() {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('backup_'))
      .sort()
      .reverse();
    
    console.log('\n📚 Available Backups:\n');
    
    if (backupFiles.length === 0) {
      console.log('  No backups found.\n');
      return;
    }
    
    for (const file of backupFiles) {
      const stats = await fs.stat(path.join(BACKUP_DIR, file));
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  📁 ${file} (${size} MB)`);
    }
    
    console.log(`\n  Total: ${backupFiles.length} backups\n`);
  } catch (error) {
    console.error('Error listing backups:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      await listBackups();
      break;
      
    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('Please specify a backup file to restore');
        process.exit(1);
      }
      await restoreFromBackup(backupFile);
      break;
      
    default:
      await createBackup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createBackup, listBackups };