import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

async function handleGetDatabaseStats(request: NextRequest) {
  // Verify admin authentication
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: 'Database not configured',
        },
        { status: 503 }
      );
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get table statistics
    const [
      usersResult,
      imagesResult,
      paymentsResult,
      subscriptionsResult,
      creditsResult,
      auditResult,
      ticketsResult,
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase
        .from('processed_images')
        .select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true }),
    ]);

    // Get recent activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [recentUsersResult, recentImagesResult, activeUsersResult] =
      await Promise.all([
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo),
        supabase
          .from('processed_images')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_sign_in_at', oneWeekAgo),
      ]);

    // Get storage usage
    const { data: storageData } = await supabase.storage.listBuckets();
    let totalStorageSize = 0;

    if (storageData) {
      for (const bucket of storageData) {
        const { data: files } = await supabase.storage
          .from(bucket.name)
          .list('', {
            limit: 1000,
          });
        if (files) {
          totalStorageSize += files.reduce(
            (acc, file) => acc + (file.metadata?.size || 0),
            0
          );
        }
      }
    }

    const stats = {
      tables: {
        users: {
          total: usersResult.count || 0,
          recent_24h: recentUsersResult.count || 0,
          active_7d: activeUsersResult.count || 0,
        },
        processed_images: {
          total: imagesResult.count || 0,
          recent_24h: recentImagesResult.count || 0,
        },
        payments: {
          total: paymentsResult.count || 0,
        },
        subscriptions: {
          total: subscriptionsResult.count || 0,
        },
        credit_transactions: {
          total: creditsResult.count || 0,
        },
        audit_logs: {
          total: auditResult.count || 0,
        },
        support_tickets: {
          total: ticketsResult.count || 0,
        },
      },
      storage: {
        buckets: storageData?.length || 0,
        total_size_bytes: totalStorageSize,
        total_size_mb: (totalStorageSize / (1024 * 1024)).toFixed(2),
      },
      database: {
        provider: 'Supabase (PostgreSQL)',
        region: env.SUPABASE_URL.includes('us-east') ? 'US East' : 'Unknown',
        status: 'connected',
      },
      summary: {
        total_records: 0,
        growth_rate_24h: 0,
      },
    };

    // Calculate totals
    stats.summary.total_records = Object.values(stats.tables).reduce(
      (acc, table) =>
        acc + (typeof table === 'object' && 'total' in table ? table.total : 0),
      0
    );

    // Calculate growth rate
    const newRecords24h =
      (recentUsersResult.count || 0) + (recentImagesResult.count || 0);
    if (stats.summary.total_records > 0) {
      stats.summary.growth_rate_24h =
        (newRecords24h / stats.summary.total_records) * 100;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Database stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get database statistics',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGetDatabaseStats, 'admin');
