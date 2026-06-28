'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import {
  Clock,
  TrendingUp,
  DollarSign,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

// ---- helpers ----------------------------------------------------------------

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toFixed(2)}`;
const pct = (n: number | null | undefined) =>
  n == null ? '—' : `${(n * 100).toFixed(1)}%`;
const date = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString() : '—';

// Status → label + color classes (intuitive, color-coded per spec).
const STATUS_META: Record<string, { label: string; cls: string }> = {
  active_trial: { label: 'Active trial', cls: 'bg-blue-100 text-blue-800' },
  trial_ending_soon: {
    label: 'Ending soon',
    cls: 'bg-orange-100 text-orange-800',
  },
  trial_canceled: { label: 'Trial canceled', cls: 'bg-red-100 text-red-800' },
  trial_expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-700' },
  converted: { label: 'Converted', cls: 'bg-green-100 text-green-800' },
  converted_then_churned: {
    label: 'Converted (churned)',
    cls: 'bg-green-100 text-green-700',
  },
  payment_failed: {
    label: 'Payment failed',
    cls: 'bg-orange-100 text-orange-900',
  },
  active_subscription: {
    label: 'Active',
    cls: 'bg-green-100 text-green-800',
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || {
    label: status,
    cls: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'gray',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'blue' | 'orange' | 'green' | 'red' | 'gray';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
          </div>
          {Icon && (
            <div className={`rounded-full p-2.5 ${tones[tone]}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-4 text-lg font-bold text-gray-900">{children}</h2>
);

// ---- page -------------------------------------------------------------------

const TRIAL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active_trial', label: 'Active' },
  { key: 'trial_ending_soon', label: 'Ending soon' },
  { key: 'payment_failed', label: 'Payment failed' },
];
const SORTS = [
  { key: 'daysRemaining', label: 'Days remaining' },
  { key: 'trialEnd', label: 'Trial end date' },
  { key: 'creditsUsed', label: 'Credits used' },
  { key: 'lastActivityAt', label: 'Last activity' },
  { key: 'monthlyValue', label: 'Projected value' },
];

export default function SubscriptionTrackingPage() {
  const router = useRouter();
  const { user, isAdmin, initialize } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratePct, setRatePct] = useState(20);
  const [appliedRate, setAppliedRate] = useState(0.2);

  // table controls
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('daysRemaining');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAllSubs, setShowAllSubs] = useState(false);

  const fetchData = useCallback(async (rate: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/subscriptions/trial-tracking?conversionRate=${rate}`,
        { credentials: 'include' }
      );
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
      fetchData(0.2);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRate = () => {
    const r = Math.min(100, Math.max(0, ratePct)) / 100;
    setAppliedRate(r);
    fetchData(r);
  };

  const trialing = data?.trialingUsers ?? [];
  const plans = useMemo(() => {
    const s = new Set<string>();
    trialing.forEach((t: any) => t.plan && s.add(t.plan));
    return Array.from(s);
  }, [trialing]);

  const filteredTrialing = useMemo(() => {
    let rows = [...trialing];
    if (statusFilter !== 'all')
      rows = rows.filter((r: any) => r.status === statusFilter);
    if (planFilter !== 'all') rows = rows.filter((r: any) => r.plan === planFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r: any) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q)
      );
    }
    rows.sort((a: any, b: any) => {
      const av = a[sortKey] ?? (sortKey === 'lastActivityAt' || sortKey === 'trialEnd' ? '' : 0);
      const bv = b[sortKey] ?? (sortKey === 'lastActivityAt' || sortKey === 'trialEnd' ? '' : 0);
      let cmp: number;
      if (sortKey === 'lastActivityAt' || sortKey === 'trialEnd') {
        cmp = new Date(av || 0).getTime() - new Date(bv || 0).getTime();
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [trialing, statusFilter, planFilter, search, sortKey, sortDir]);

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading subscription
          &amp; trial data…
        </div>
      </AdminLayout>
    );
  }

  const s = data?.summary ?? {};
  const subs = data?.activeSubscriptions ?? {};
  const proj = data?.revenueProjections ?? {};
  const ins = data?.conversionInsights ?? {};
  const canceled = data?.canceledTrials ?? [];
  const trialsByPlan: Record<string, { count: number; projectedMRR: number }> =
    data?.trialsByPlan ?? {};

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
              Monitor the trial funnel and projected subscription revenue.
              {data?.meta?.generatedAt && (
                <span className="ml-1 text-gray-400">
                  Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchData(appliedRate)}
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
        {data?.meta?.truncated && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Showing the most recent 500 subscriptions from Stripe — older history
            is truncated.
          </div>
        )}

        {/* 1. Trial overview cards */}
        <section>
          <SectionLabel>Trial Overview</SectionLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Active trials" value={s.activeTrials ?? 0} icon={Clock} tone="blue" />
            <StatCard label="Ending in 24h" value={s.endingIn24h ?? 0} icon={AlertTriangle} tone="orange" />
            <StatCard label="Ending in 3 days" value={s.endingIn3d ?? 0} icon={Clock} tone="orange" />
            <StatCard label="Ending in 7 days" value={s.endingIn7d ?? 0} icon={Clock} tone="orange" />
            <StatCard label="Canceled trials" value={s.canceledTrials ?? 0} icon={XCircle} tone="red" />
            <StatCard label="Expired trials" value={s.expiredTrials ?? 0} icon={XCircle} tone="gray" />
            <StatCard label="Conversions" value={s.conversions ?? 0} icon={CheckCircle2} tone="green" />
            <StatCard label="Conversion rate" value={pct(s.conversionRate)} hint="historical" icon={TrendingUp} tone="green" />
            <StatCard label="Projected trial revenue" value={money(s.projectedTrialRevenue)} hint="if all active trials convert" icon={DollarSign} tone="blue" />
            <StatCard label="Active subscription MRR" value={money(s.activeMRR)} icon={DollarSign} tone="green" />
            <StatCard label="Total projected MRR" value={money(s.totalProjectedMRR)} hint={`subs + weighted trials @ ${(appliedRate * 100).toFixed(0)}%`} icon={TrendingUp} tone="green" />
          </div>
        </section>

        {/* Trials by plan */}
        <section>
          <SectionLabel>Trials by Plan</SectionLabel>
          <Card>
            <CardContent className="p-5">
              {Object.keys(trialsByPlan).length === 0 ? (
                <p className="text-sm text-gray-400">No active trials.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {Object.entries(trialsByPlan).map(([plan, v]) => (
                    <div
                      key={plan}
                      className="min-w-[150px] rounded-lg border border-gray-200 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {plan} trial
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {v.count}
                      </p>
                      <p className="text-xs text-gray-500">
                        {money(v.projectedMRR)}/mo if they convert
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 2. Trialing users table */}
        <section>
          <SectionLabel>Trialing Users</SectionLabel>
          <Card>
            <CardContent className="p-4">
              {/* filters */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {TRIAL_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      statusFilter === f.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <select
                  value={planFilter}
                  onChange={e => setPlanFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="all">All plans</option>
                  {plans.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {SORTS.map(o => (
                    <option key={o.key} value={o.key}>
                      Sort: {o.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-600"
                  title="Toggle sort direction"
                >
                  {sortDir === 'asc' ? '↑' : '↓'}
                </button>
                <div className="relative ml-auto">
                  <Search className="pointer-events-none absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name/email"
                    className="rounded-lg border border-gray-300 py-1 pl-8 pr-2 text-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-2 py-2">User</th>
                      <th className="px-2 py-2">Plan</th>
                      <th className="px-2 py-2">Bills on</th>
                      <th className="px-2 py-2">Days left</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Card</th>
                      <th className="px-2 py-2">Credits used</th>
                      <th className="px-2 py-2">Tools</th>
                      <th className="px-2 py-2">Last activity</th>
                      <th className="px-2 py-2">Value</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTrialing.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-2 py-8 text-center text-gray-400">
                          No trialing users match these filters.
                        </td>
                      </tr>
                    )}
                    {filteredTrialing.map((t: any) => (
                      <tr key={t.subscriptionId} className="hover:bg-gray-50">
                        <td className="px-2 py-2">
                          <div className="font-medium text-gray-900">{t.name || '—'}</div>
                          <div className="text-xs text-gray-500">{t.email || '—'}</div>
                        </td>
                        <td className="px-2 py-2 capitalize">{t.plan}</td>
                        <td className="px-2 py-2">{date(t.trialEnd)}</td>
                        <td className="px-2 py-2">{t.daysRemaining ?? '—'}</td>
                        <td className="px-2 py-2"><StatusBadge status={t.status} /></td>
                        <td className="px-2 py-2">{t.cardOnFile ? '✓' : '—'}</td>
                        <td className="px-2 py-2">{t.creditsUsed}</td>
                        <td className="px-2 py-2 text-xs text-gray-600">
                          {t.toolsUsed?.length ? t.toolsUsed.join(', ') : '—'}
                        </td>
                        <td className="px-2 py-2 text-xs">{date(t.lastActivityAt)}</td>
                        <td className="px-2 py-2">{money(t.monthlyValue)}/mo</td>
                        <td className="px-2 py-2">
                          {t.userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/users/${t.userId}`)}
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
        </section>

        {/* 3 + 4: canceled trials & insights side by side on large screens */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 3. Canceled trials */}
          <section>
            <SectionLabel>Canceled Trials</SectionLabel>
            <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Plan</th>
                        <th className="px-2 py-2">Canceled</th>
                        <th className="px-2 py-2">Day of trial</th>
                        <th className="px-2 py-2">Credits</th>
                        <th className="px-2 py-2">Uploaded?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {canceled.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center text-gray-400">
                            No canceled trials.
                          </td>
                        </tr>
                      )}
                      {canceled.map((c: any) => (
                        <tr key={c.subscriptionId} className="hover:bg-gray-50">
                          <td className="px-2 py-2">
                            <div className="font-medium text-gray-900">{c.name || '—'}</div>
                            <div className="text-xs text-gray-500">{c.email || '—'}</div>
                          </td>
                          <td className="px-2 py-2 capitalize">{c.plan}</td>
                          <td className="px-2 py-2 text-xs">{date(c.canceledAt)}</td>
                          <td className="px-2 py-2">{c.daysIntoTrial ?? '—'}</td>
                          <td className="px-2 py-2">{c.creditsUsed}</td>
                          <td className="px-2 py-2">{c.uploadedFileCount > 0 ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 4. Conversion insights */}
          <section>
            <SectionLabel>Trial Conversion Insights</SectionLabel>
            <Card>
              <CardContent className="space-y-3 p-5 text-sm">
                <Insight label="Trial-to-paid conversion rate" value={pct(ins.conversionRate)} />
                <Insight label="Avg days until conversion" value={ins.avgDaysToConversion ?? '—'} />
                <Insight label="Most common converted plan" value={ins.mostConvertedPlan ? <span className="capitalize">{ins.mostConvertedPlan}</span> : '—'} />
                <Insight label="High usage but no conversion" value={ins.highUsageNoConversion ?? 0} />
                <Insight label="Trial users with no activity" value={ins.noActivity ?? 0} />
                <Insight label="Used credits but didn’t subscribe" value={ins.usedCreditsNoSubscribe ?? 0} />
                <Insight label="Used the free DPI checker only" value={ins.dpiCheckerOnly ?? 0} />
              </CardContent>
            </Card>
          </section>
        </div>

        {/* 6. Revenue projection */}
        <section>
          <SectionLabel>Revenue Projection</SectionLabel>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Assumed trial conversion rate:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={ratePct}
              onChange={e => setRatePct(parseInt(e.target.value || '0', 10))}
              className="w-20 rounded-lg border border-gray-300 px-2 py-1"
            />
            <span className="text-gray-600">%</span>
            <Button size="sm" variant="secondary" onClick={applyRate}>
              Apply
            </Button>
            {proj.historicalConversionRate != null && (
              <span className="text-xs text-gray-400">
                (historical: {pct(proj.historicalConversionRate)})
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Current MRR" value={money(proj.currentMRR)} tone="green" />
            <StatCard label="MRR if all trials convert" value={money(proj.projectedMRRIfAllTrialsConvert)} tone="blue" />
            <StatCard label="Weighted projected MRR" value={money(proj.weightedProjectedMRR)} hint={`@ ${(appliedRate * 100).toFixed(0)}%`} tone="blue" />
            <StatCard label="Projected ARR (active)" value={money(proj.projectedARR)} tone="green" />
            <StatCard label="Projected ARR + trials" value={money(proj.projectedARRWithWeightedTrials)} tone="blue" />
            <StatCard label="Lost MRR from canceled trials" value={money(proj.lostTrialRevenue)} tone="red" />
          </div>
        </section>

        {/* 5. Active recurring subscriptions (compact) */}
        <section>
          <SectionLabel>Active Recurring Subscriptions</SectionLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Active subscribers" value={subs.activePaidSubscribers ?? 0} tone="green" />
            <StatCard label="Current MRR" value={money(subs.currentMRR)} tone="green" />
            <StatCard label="Projected ARR" value={money(subs.projectedARR)} tone="green" />
            <StatCard label="Past due" value={subs.pastDue ?? 0} tone="orange" />
            <StatCard label="Canceling at period end" value={subs.cancelingAtPeriodEnd ?? 0} tone="orange" />
            <StatCard label="Canceled (last 30d)" value={subs.recentlyCanceled ?? 0} tone="red" />
          </div>

          <Card className="mt-4">
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Plan breakdown</p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(subs.planBreakdown || {}).map(
                  ([plan, v]: [string, any]) => (
                    <div key={plan} className="rounded-lg border border-gray-200 px-4 py-2">
                      <p className="text-xs uppercase text-gray-500">{plan}</p>
                      <p className="text-lg font-bold text-gray-900">{v.count}</p>
                      <p className="text-xs text-gray-500">{money(v.mrr)} MRR</p>
                    </div>
                  )
                )}
                {Object.keys(subs.planBreakdown || {}).length === 0 && (
                  <p className="text-sm text-gray-400">No active subscriptions.</p>
                )}
              </div>

              <button
                onClick={() => setShowAllSubs(v => !v)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600"
              >
                {showAllSubs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllSubs ? 'Hide' : 'View all active subscriptions'}
              </button>

              {showAllSubs && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Plan</th>
                        <th className="px-2 py-2">Value</th>
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(subs.list || []).map((row: any) => (
                        <tr key={row.subscriptionId} className="hover:bg-gray-50">
                          <td className="px-2 py-2">
                            <div className="font-medium text-gray-900">{row.name || '—'}</div>
                            <div className="text-xs text-gray-500">{row.email || '—'}</div>
                          </td>
                          <td className="px-2 py-2 capitalize">{row.plan}</td>
                          <td className="px-2 py-2">{money(row.monthlyValue)}/mo</td>
                          <td className="px-2 py-2">
                            {row.cancelAtPeriodEnd ? (
                              <span className="text-xs text-orange-700">Canceling</span>
                            ) : (
                              <StatusBadge status="active_subscription" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AdminLayout>
  );
}

function Insight({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
