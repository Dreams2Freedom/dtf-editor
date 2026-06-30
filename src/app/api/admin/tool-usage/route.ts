import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * Admin tool-usage detail endpoint — powers the drill-down from the dashboard
 * "Success Rate" metric. Returns individual tool runs (which tool, when, status,
 * why it failed) plus a failure-by-tool breakdown, so admins can see what's
 * failing and prevent further issues.
 *
 * Source: api_usage_logs (operation = tool, processing_status, error_message,
 * processing_time_ms, created_at, user_id). Admin-only.
 */

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

async function handleGet(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || 'failed').toLowerCase(); // failed | success | all
  const toolFilter = url.searchParams.get('tool') || '';
  const days = Math.min(
    365,
    Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30)
  );
  const limit = Math.min(
    1000,
    Math.max(10, parseInt(url.searchParams.get('limit') || '300', 10) || 300)
  );

  const service = createServiceRoleSupabaseClient();
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

  // Pull the window once; derive summary + breakdown + table from it.
  const { data: logs, error } = await service
    .from('api_usage_logs')
    .select(
      'id, user_id, provider, operation, processing_status, error_message, processing_time_ms, created_at'
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json(
      { error: `Failed to load tool usage: ${error.message}` },
      { status: 500 }
    );
  }

  const all = logs || [];

  // Summary over the whole window.
  const total = all.length;
  const successCount = all.filter(l => l.processing_status === 'success').length;
  const failedCount = all.filter(l => l.processing_status === 'failed').length;
  const refundedCount = all.filter(l => l.processing_status === 'refunded').length;
  const successRate = total > 0 ? (successCount / total) * 100 : 100;

  // Failures grouped by tool (operation), with the most recent error + count.
  const byTool = new Map<
    string,
    { tool: string; failures: number; total: number; lastError: string | null; lastFailedAt: string | null }
  >();
  for (const l of all) {
    const key = l.operation || 'unknown';
    const entry =
      byTool.get(key) || {
        tool: key,
        failures: 0,
        total: 0,
        lastError: null,
        lastFailedAt: null,
      };
    entry.total++;
    if (l.processing_status === 'failed') {
      entry.failures++;
      if (!entry.lastFailedAt) {
        entry.lastError = l.error_message || null;
        entry.lastFailedAt = l.created_at;
      }
    }
    byTool.set(key, entry);
  }
  const failuresByTool = Array.from(byTool.values())
    .filter(t => t.failures > 0)
    .sort((a, b) => b.failures - a.failures);

  // Rows for the table — apply status + tool filters.
  let rows = all;
  if (status === 'failed') rows = rows.filter(l => l.processing_status === 'failed');
  else if (status === 'success') rows = rows.filter(l => l.processing_status === 'success');
  if (toolFilter) rows = rows.filter(l => l.operation === toolFilter);
  rows = rows.slice(0, limit);

  // Enrich rows with the user's email.
  const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
  const emailById = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    (profiles || []).forEach(p => emailById.set(p.id, p.email));
  }

  return NextResponse.json({
    meta: { days, generatedAt: new Date().toISOString(), windowCapped: all.length >= 2000 },
    summary: {
      total,
      success: successCount,
      failed: failedCount,
      refunded: refundedCount,
      successRate,
    },
    failuresByTool,
    tools: Array.from(new Set(all.map(l => l.operation).filter(Boolean))).sort(),
    rows: rows.map(r => ({
      id: r.id,
      tool: r.operation,
      provider: r.provider,
      status: r.processing_status,
      errorMessage: r.error_message,
      processingTimeMs: r.processing_time_ms,
      createdAt: r.created_at,
      userId: r.user_id,
      email: r.user_id ? emailById.get(r.user_id) || null : null,
    })),
  });
}

export const GET = withRateLimit(handleGet, 'api');
