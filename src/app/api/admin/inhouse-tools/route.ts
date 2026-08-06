import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

/**
 * Admin analytics for our free IN-HOUSE tools (SAM background removal, etc.).
 *
 * Source: `inhouse_tool_events` (separate from the third-party billing table
 * `api_usage_logs`). Returns, over a time window:
 *   - summary: total runs, successes, errors, success rate, avg processing time,
 *     unique users
 *   - byTool: per tool+operation totals and success rate
 *   - errors: top error reasons with counts
 *   - daily: usage-over-time (runs / successes / errors per day)
 *   - rows: recent individual events
 *
 * Admin-only. Read via the service role (the table is RLS-locked from the
 * browser).
 */

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { user };
}

interface EventRow {
  id: string;
  user_id: string | null;
  tool: string;
  operation: string;
  status: string;
  processing_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const days = Math.min(
    365,
    Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30)
  );
  const toolFilter = url.searchParams.get('tool') || '';
  const rowLimit = Math.min(
    500,
    Math.max(10, parseInt(url.searchParams.get('limit') || '100', 10) || 100)
  );

  const service = createServiceRoleSupabaseClient();
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

  let query = service
    .from('inhouse_tool_events')
    .select(
      'id, user_id, tool, operation, status, processing_time_ms, error_message, created_at'
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (toolFilter) query = query.eq('tool', toolFilter);

  const { data, error } = await query;

  if (error) {
    // The table may not exist yet (migration not applied). Treat as empty so the
    // dashboard renders a friendly "no data" state instead of a 500.
    const missing =
      /relation .*inhouse_tool_events.* does not exist/i.test(
        error.message || ''
      ) || error.code === '42P01';
    if (missing) {
      return NextResponse.json({
        summary: emptySummary(days),
        byTool: [],
        errors: [],
        daily: [],
        rows: [],
        tools: [],
        tableMissing: true,
      });
    }
    return NextResponse.json(
      { error: `Failed to load in-house tool events: ${error.message}` },
      { status: 500 }
    );
  }

  const all = (data || []) as EventRow[];

  const total = all.length;
  const successes = all.filter(e => e.status === 'success').length;
  const errors = total - successes;
  const successTimes = all
    .filter(
      e => e.status === 'success' && typeof e.processing_time_ms === 'number'
    )
    .map(e => e.processing_time_ms as number);
  const avgMs =
    successTimes.length > 0
      ? Math.round(
          successTimes.reduce((a, b) => a + b, 0) / successTimes.length
        )
      : null;
  const uniqueUsers = new Set(all.map(e => e.user_id).filter(Boolean)).size;

  // Per tool + operation.
  const byToolMap = new Map<
    string,
    { tool: string; operation: string; total: number; success: number }
  >();
  for (const e of all) {
    const key = `${e.tool}:${e.operation}`;
    const cur = byToolMap.get(key) || {
      tool: e.tool,
      operation: e.operation,
      total: 0,
      success: 0,
    };
    cur.total += 1;
    if (e.status === 'success') cur.success += 1;
    byToolMap.set(key, cur);
  }
  const byTool = Array.from(byToolMap.values())
    .map(t => ({
      ...t,
      errors: t.total - t.success,
      successRate: t.total > 0 ? t.success / t.total : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Top error reasons.
  const errMap = new Map<string, number>();
  for (const e of all) {
    if (e.status !== 'success') {
      const reason = e.error_message || 'unknown';
      errMap.set(reason, (errMap.get(reason) || 0) + 1);
    }
  }
  const errorBreakdown = Array.from(errMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Daily usage-over-time (UTC day buckets).
  const dayMap = new Map<
    string,
    { date: string; total: number; success: number; error: number }
  >();
  for (const e of all) {
    const date = e.created_at.slice(0, 10);
    const cur = dayMap.get(date) || { date, total: 0, success: 0, error: 0 };
    cur.total += 1;
    if (e.status === 'success') cur.success += 1;
    else cur.error += 1;
    dayMap.set(date, cur);
  }
  const daily = Array.from(dayMap.values()).sort((a, b) =>
    a.date < b.date ? -1 : 1
  );

  const tools = Array.from(new Set(all.map(e => e.tool))).sort();

  return NextResponse.json({
    summary: {
      days,
      total,
      successes,
      errors,
      successRate: total > 0 ? successes / total : null,
      avgMs,
      uniqueUsers,
    },
    byTool,
    errors: errorBreakdown,
    daily,
    rows: all.slice(0, rowLimit),
    tools,
    tableMissing: false,
  });
}

function emptySummary(days: number) {
  return {
    days,
    total: 0,
    successes: 0,
    errors: 0,
    successRate: null,
    avgMs: null,
    uniqueUsers: 0,
  };
}
