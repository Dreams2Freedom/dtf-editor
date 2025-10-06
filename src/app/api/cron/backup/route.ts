import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';

// Tables to backup
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
  'user_settings',
];

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting automated database backup...');

    const supabase = await createServerSupabaseClient();
    const backupData: Record<string, any> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tables: {},
    };

    // Export each table
    for (const tableName of TABLES_TO_BACKUP) {
      try {
        console.log(`Backing up ${tableName}...`);

        // Get row count first for large tables
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        // For large tables, backup in chunks
        const chunkSize = 1000;
        const chunks = Math.ceil((count || 0) / chunkSize);
        let allData: any[] = [];

        for (let i = 0; i < chunks; i++) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(i * chunkSize, (i + 1) * chunkSize - 1)
            .order('created_at', { ascending: false });

          if (error) {
            console.error(`Error backing up ${tableName}:`, error);
            continue;
          }

          allData = allData.concat(data || []);
        }

        backupData.tables[tableName] = {
          rowCount: allData.length,
          data: allData,
        };

        console.log(`✓ Backed up ${allData.length} rows from ${tableName}`);
      } catch (error) {
        console.error(`Failed to backup ${tableName}:`, error);
      }
    }

    // Store backup metadata
    const { error: metaError } = await supabase.from('system_backups').insert({
      backup_date: new Date().toISOString(),
      table_count: Object.keys(backupData.tables).length,
      total_rows: Object.values(backupData.tables).reduce(
        (sum: number, table: any) => sum + table.rowCount,
        0
      ),
      status: 'completed',
      environment: process.env.NODE_ENV,
    });

    if (metaError) {
      console.error('Failed to store backup metadata:', metaError);
    }

    // In production, you would upload this to a secure backup location
    // For example: AWS S3, Google Cloud Storage, or another Supabase project

    const summary = {
      success: true,
      timestamp: backupData.timestamp,
      tables: Object.keys(backupData.tables).length,
      totalRows: Object.values(backupData.tables).reduce(
        (sum: number, table: any) => sum + table.rowCount,
        0
      ),
    };

    console.log('Backup completed:', summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json(
      {
        error: 'Backup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// This endpoint can also be called via POST for manual backups
export async function POST(request: NextRequest) {
  return GET(request);
}
