'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import { RefreshCw, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

const when = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');
const ms = (n: number | null) => (n == null ? '—' : `${(n / 1000).toFixed(1)}s`);

const STATUS_CLS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-amber-100 text-amber-800',
};

export default function ToolUsagePage() {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<'failed' | 'success' | 'all'>('failed');
  const [tool, setTool] = useState('');
  const [days, setDays] = useState(30);

  const fetchData = useCallback(
    async (st: string, tl: string, d: number) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ status: st, days: String(d) });
        if (tl) qs.set('tool', tl);
        const res = await fetch(`/api/admin/tool-usage?${qs.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        setData(await res.json());
      } catch (e: any) {
        setError(e.message || 'Failed to load tool usage');
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
      fetchData(status, tool, days);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = (st = status, tl = tool, d = days) => {
    setStatus(st as any);
    setTool(tl);
    setDays(d);
    fetchData(st, tl, d);
  };

  const summary = data?.summary ?? {};
  const failuresByTool = data?.failuresByTool ?? [];
  const rows = data?.rows ?? [];
  const tools = data?.tools ?? [];

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading tool usage…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tool Usage &amp; Failures</h1>
            <p className="mt-1 text-sm text-gray-600">
              What failed, when, and why — last {days} days.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={e => reload(status, tool, parseInt(e.target.value, 10))}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchData(status, tool, days)}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Success rate" value={`${(summary.successRate ?? 0).toFixed(1)}%`} icon={CheckCircle2} tone="green" />
          <Stat label="Total runs" value={summary.total ?? 0} icon={Activity} tone="gray" />
          <Stat label="Failed" value={summary.failed ?? 0} icon={AlertTriangle} tone="red" />
          <Stat label="Refunded" value={summary.refunded ?? 0} icon={AlertTriangle} tone="amber" />
        </div>

        {/* Failures by tool */}
        {failuresByTool.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-gray-700">Failures by tool</p>
              <div className="flex flex-wrap gap-3">
                {failuresByTool.map((t: any) => (
                  <button
                    key={t.tool}
                    onClick={() => reload('failed', t.tool, days)}
                    className={`rounded-xl border px-4 py-2 text-left transition-colors hover:bg-gray-50 ${
                      tool === t.tool ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
                    }`}
                  >
                    <p className="text-sm font-semibold capitalize text-gray-900">
                      {(t.tool || 'unknown').replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-red-700">
                      {t.failures} failed / {t.total} runs
                    </p>
                    {t.lastError && (
                      <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-500" title={t.lastError}>
                        {t.lastError}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters + table */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(['failed', 'success', 'all'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => reload(s, tool, days)}
                  className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                    status === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
              <select
                value={tool}
                onChange={e => reload(status, e.target.value, days)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">All tools</option>
                {tools.map((t: string) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <span className="ml-auto text-sm text-gray-400">{rows.length} shown</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-2">Tool</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">When</th>
                    <th className="px-2 py-2">Why (error)</th>
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-10 text-center text-gray-400">
                        No tool runs match these filters.
                      </td>
                    </tr>
                  )}
                  {rows.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2.5">
                        <div className="font-medium capitalize text-gray-900">
                          {(r.tool || 'unknown').replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-400">{r.provider}</div>
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLS[r.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-xs">{when(r.createdAt)}</td>
                      <td className="px-2 py-2.5 text-xs text-gray-700">
                        {r.errorMessage ? (
                          <span className="block max-w-md break-words" title={r.errorMessage}>
                            {r.errorMessage}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        {r.userId ? (
                          <button
                            onClick={() => router.push(`/admin/users/${r.userId}`)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {r.email || 'view'}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-xs">{ms(r.processingTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'green' | 'red' | 'amber' | 'gray';
}) {
  const tones: Record<string, string> = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <span className={`rounded-full p-2.5 ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
