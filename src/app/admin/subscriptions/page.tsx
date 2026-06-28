'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import {
  Users,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  ChevronRight,
} from 'lucide-react';

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString() : '—';

type Category = 'onPlan' | 'trialing' | 'canceled';

const CATEGORY_META: Record<
  Category,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string; ring: string }
> = {
  onPlan: {
    label: 'On a Plan',
    icon: Users,
    tone: 'text-green-600 bg-green-50',
    ring: 'ring-green-500 border-green-500',
  },
  trialing: {
    label: 'Trialing',
    icon: Clock,
    tone: 'text-blue-600 bg-blue-50',
    ring: 'ring-blue-500 border-blue-500',
  },
  canceled: {
    label: 'Canceled',
    icon: XCircle,
    tone: 'text-red-600 bg-red-50',
    ring: 'ring-red-500 border-red-500',
  },
};

export default function SubscriptionTrackingPage() {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Category>('onPlan');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscriptions/trial-tracking', {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!user) await initialize();
      const state = useAuthStore.getState();
      if (!state.user) {
        router.push('/admin/login');
        return;
      }
      if (!state.isAdmin) {
        toast.error('Admin privileges required.');
        router.push('/dashboard');
        return;
      }
      fetchData();
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = data?.counts ?? { onPlan: 0, trialing: 0, canceled: 0 };
  const proj = data?.revenueProjections ?? {};

  // Rows for the selected category, normalized to a common shape.
  const rows = useMemo(() => {
    if (!data) return [];
    if (selected === 'onPlan') {
      return (data.activeSubscriptions?.list ?? []).map((r: any) => ({
        userId: r.userId,
        name: r.name,
        email: r.email,
        plan: r.plan,
        primary: `${money(r.monthlyValue)}/mo`,
        secondary: r.cancelAtPeriodEnd ? 'Canceling at period end' : 'Active',
        secondaryTone: r.cancelAtPeriodEnd ? 'text-orange-700' : 'text-green-700',
      }));
    }
    if (selected === 'trialing') {
      return (data.trialingUsers ?? [])
        .filter((t: any) => t.status === 'active_trial' || t.status === 'trial_ending_soon')
        .map((t: any) => ({
          userId: t.userId,
          name: t.name,
          email: t.email,
          plan: t.plan,
          primary: `Bills ${date(t.trialEnd)}`,
          secondary:
            t.daysRemaining != null ? `${t.daysRemaining} days left` : '',
          secondaryTone:
            t.status === 'trial_ending_soon' ? 'text-orange-700' : 'text-blue-700',
        }));
    }
    return (data.canceled ?? []).map((c: any) => ({
      userId: c.userId,
      name: c.name,
      email: c.email,
      plan: c.plan,
      primary: c.kind === 'trial' ? 'Trial' : 'Membership',
      secondary: `Canceled ${date(c.canceledAt)}`,
      secondaryTone: 'text-gray-600',
    }));
  }, [data, selected]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r: any) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const arrWithTrials =
    proj.projectedMRRIfAllTrialsConvert != null
      ? proj.projectedMRRIfAllTrialsConvert * 12
      : null;

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading subscription
          data…
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
            <h1 className="text-2xl font-bold text-gray-900">
              Subscription &amp; Trial Tracking
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Click a category to view and manage those tenants.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Three clickable category counts */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(['onPlan', 'trialing', 'canceled'] as Category[]).map(cat => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const active = selected === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelected(cat);
                  setSearch('');
                }}
                className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow ${
                  active ? `${meta.ring} ring-2` : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-full p-2.5 ${meta.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <ChevronRight
                    className={`h-5 w-5 ${active ? 'text-gray-700' : 'text-gray-300'}`}
                  />
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {counts[cat] ?? 0}
                </p>
                <p className="text-sm font-medium text-gray-600">{meta.label}</p>
              </button>
            );
          })}
        </div>

        {/* Inline tenant list for the selected category */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {CATEGORY_META[selected].label}{' '}
                <span className="text-gray-400">({filteredRows.length})</span>
              </h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name / email"
                  className="rounded-lg border border-gray-300 py-1.5 pl-8 pr-2 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-2">Tenant</th>
                    <th className="px-2 py-2">Plan</th>
                    <th className="px-2 py-2">
                      {selected === 'onPlan'
                        ? 'Monthly'
                        : selected === 'trialing'
                          ? 'Billing'
                          : 'Type'}
                    </th>
                    <th className="px-2 py-2">
                      {selected === 'canceled' ? 'Canceled' : 'Status'}
                    </th>
                    <th className="px-2 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-10 text-center text-gray-400">
                        No tenants in this category.
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((r: any, i: number) => (
                    <tr key={r.userId || i} className="hover:bg-gray-50">
                      <td className="px-2 py-2.5">
                        <div className="font-medium text-gray-900">{r.name || '—'}</div>
                        <div className="text-xs text-gray-500">{r.email || '—'}</div>
                      </td>
                      <td className="px-2 py-2.5 capitalize">{r.plan}</td>
                      <td className="px-2 py-2.5">{r.primary}</td>
                      <td className={`px-2 py-2.5 ${r.secondaryTone}`}>{r.secondary}</td>
                      <td className="px-2 py-2.5 text-right">
                        {r.userId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/users/${r.userId}`)}
                          >
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Revenue numbers */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Revenue</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <RevenueCard label="Monthly (MRR)" value={money(proj.currentMRR)} tone="green" />
            <RevenueCard
              label="Projected monthly"
              value={money(proj.projectedMRRIfAllTrialsConvert)}
              hint="if all trials convert"
              tone="blue"
            />
            <RevenueCard label="ARR (current)" value={money(proj.projectedARR)} tone="green" />
            <RevenueCard
              label="ARR (with trials)"
              value={money(arrWithTrials)}
              hint="if all trials convert"
              tone="blue"
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function RevenueCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'green' | 'blue';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p
          className={`mt-1.5 text-2xl font-bold ${
            tone === 'green' ? 'text-green-700' : 'text-blue-700'
          }`}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}
