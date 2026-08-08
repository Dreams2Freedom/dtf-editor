'use client';

/**
 * Admin — In-House Tools analytics.
 *
 * Tracks success / error / usage for our own free in-house tools (starting with
 * SAM background removal), sourced from `inhouse_tool_events` via
 * `/api/admin/inhouse-tools`. Replaces the old "BG Removal Eval" and "BG Studio"
 * admin pages, which were one-off manual test harnesses rather than analytics.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import {
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Timer,
} from 'lucide-react';

const when = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');
const ms = (n: number | null | undefined) =>
  n == null ? '—' : `${(n / 1000).toFixed(1)}s`;
const pct = (n: number | null | undefined) =>
  n == null ? '—' : `${(n * 100).toFixed(1)}%`;

interface Summary {
  days: number;
  total: number;
  successes: number;
  errors: number;
  successRate: number | null;
  avgMs: number | null;
  uniqueUsers: number;
}
interface ByTool {
  tool: string;
  operation: string;
  total: number;
  success: number;
  errors: number;
  successRate: number;
}
interface DailyPoint {
  date: string;
  total: number;
  success: number;
  error: number;
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
interface Data {
  summary: Summary;
  byTool: ByTool[];
  errors: { reason: string; count: number }[];
  daily: DailyPoint[];
  rows: EventRow[];
  tools: string[];
  tableMissing: boolean;
}

export default function InhouseToolsPage() {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [tool, setTool] = useState('');

  const fetchData = useCallback(async (d: number, tl: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ days: String(d) });
      if (tl) qs.set('tool', tl);
      const res = await fetch(`/api/admin/inhouse-tools?${qs.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!user) await initialize();
      const s = useAuthStore.getState();
      if (!s.user) {
        router.push('/admin/login');
        return;
      }
      if (!s.isAdmin) {
        toast.error('Admin privileges required.');
        router.push('/dashboard');
        return;
      }
      fetchData(days, tool);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = (d = days, tl = tool) => {
    setDays(d);
    setTool(tl);
    fetchData(d, tl);
  };

  const summary = data?.summary;
  const maxDaily = Math.max(1, ...(data?.daily ?? []).map(d => d.total));

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading in-house
          tool analytics…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">In-House Tools</h1>
            <p className="mt-1 text-sm text-gray-600">
              Success, errors, and usage for our free in-house tools — last{' '}
              {days} days.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tool}
              onChange={e => reload(days, e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">All tools</option>
              {(data?.tools ?? []).map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={days}
              onChange={e => reload(parseInt(e.target.value, 10), tool)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reload()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data?.tableMissing && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No data yet. Apply the migration{' '}
            <code className="rounded bg-amber-100 px-1">
              20260806_inhouse_tool_events.sql
            </code>{' '}
            in Supabase, then in-house tool runs will start appearing here.
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            icon={<Activity className="h-5 w-5 text-blue-600" />}
            label="Total runs"
            value={String(summary?.total ?? 0)}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            label="Success rate"
            value={pct(summary?.successRate)}
            sub={`${summary?.successes ?? 0} ok`}
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            label="Errors"
            value={String(summary?.errors ?? 0)}
          />
          <StatCard
            icon={<Timer className="h-5 w-5 text-purple-600" />}
            label="Avg time"
            value={ms(summary?.avgMs)}
            sub="successful runs"
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-gray-600" />}
            label="Unique users"
            value={String(summary?.uniqueUsers ?? 0)}
          />
        </div>

        {/* Usage over time */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">
              Usage over time
            </h2>
            {(data?.daily ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">No runs in this window.</p>
            ) : (
              <div className="flex items-end gap-1 overflow-x-auto">
                {data!.daily.map(d => (
                  <div
                    key={d.date}
                    className="flex min-w-[14px] flex-1 flex-col items-center gap-1"
                    title={`${d.date}: ${d.total} runs (${d.success} ok, ${d.error} err)`}
                  >
                    <div
                      className="flex w-full flex-col justify-end"
                      style={{ height: 120 }}
                    >
                      <div
                        className="w-full rounded-t bg-red-400"
                        style={{
                          height: `${(d.error / maxDaily) * 120}px`,
                        }}
                      />
                      <div
                        className="w-full bg-green-500"
                        style={{
                          height: `${(d.success / maxDaily) * 120}px`,
                        }}
                      />
                    </div>
                    <span className="rotate-45 whitespace-nowrap text-[9px] text-gray-400">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-green-500" />
                Success
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-400" />
                Error
              </span>
            </div>
          </CardContent>
        </Card>

        {/* By tool + Error breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-800">
                By tool &amp; operation
              </h2>
              {(data?.byTool ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No data.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400">
                      <th className="pb-2">Tool</th>
                      <th className="pb-2">Op</th>
                      <th className="pb-2 text-right">Runs</th>
                      <th className="pb-2 text-right">Errors</th>
                      <th className="pb-2 text-right">Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.byTool.map(t => (
                      <tr
                        key={`${t.tool}:${t.operation}`}
                        className="border-t border-gray-100"
                      >
                        <td className="py-2 font-medium text-gray-800">
                          {t.tool}
                        </td>
                        <td className="py-2 text-gray-600">{t.operation}</td>
                        <td className="py-2 text-right tabular-nums">
                          {t.total}
                        </td>
                        <td className="py-2 text-right tabular-nums text-red-600">
                          {t.errors}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {pct(t.successRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-800">
                Top error reasons
              </h2>
              {(data?.errors ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No errors 🎉</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data!.errors.map(e => (
                      <tr key={e.reason} className="border-t border-gray-100">
                        <td className="py-2 text-gray-700">{e.reason}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                          {e.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent events */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">
              Recent events
            </h2>
            {(data?.rows ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">No events.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400">
                      <th className="pb-2">When</th>
                      <th className="pb-2">Tool</th>
                      <th className="pb-2">Op</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Time</th>
                      <th className="pb-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.rows.map(r => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="whitespace-nowrap py-2 text-gray-600">
                          {when(r.created_at)}
                        </td>
                        <td className="py-2 text-gray-800">{r.tool}</td>
                        <td className="py-2 text-gray-600">{r.operation}</td>
                        <td className="py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              r.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-600">
                          {ms(r.processing_time_ms)}
                        </td>
                        <td className="max-w-[220px] truncate py-2 text-gray-500">
                          {r.error_message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          {icon}
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
      </CardContent>
    </Card>
  );
}
