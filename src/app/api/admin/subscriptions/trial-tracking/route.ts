import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { getStripeService } from '@/services/stripe';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * Admin "Subscription & Trial Tracking" data endpoint.
 *
 * Source of truth = Stripe (the only place the full trial funnel survives, since
 * the DB overwrites trial state on cancel/convert). We pull all subscriptions
 * from Stripe, classify the trial funnel, and enrich each user from the DB
 * (profiles: name/email/credits/last_activity; credit_transactions: usage;
 * images: uploads). No schema changes. Admin-only.
 *
 * Fields we do NOT track anywhere (shown as "not tracked" in the UI):
 *   - download/export count
 *   - in-app cancellation reason (Stripe cancellation_details.feedback used if present)
 */

const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Monthly plan prices (consistent with admin/analytics/revenue).
const PLAN_PRICES: Record<string, number> = {
  basic: 9.99,
  starter: 24.99,
  professional: 49.99,
};
// Map a Stripe price amount (cents) to a plan key.
const AMOUNT_TO_PLAN: Record<number, string> = {
  999: 'basic',
  2499: 'starter',
  4999: 'professional',
};

const SUB_PAGE_CAP = 5; // up to 500 subscriptions per refresh
const DAY = 86400; // seconds

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

function planForSub(sub: any): string {
  const item = sub.items?.data?.[0];
  const amount = item?.price?.unit_amount;
  if (typeof amount === 'number' && AMOUNT_TO_PLAN[amount]) {
    return AMOUNT_TO_PLAN[amount];
  }
  return 'unknown';
}

function planValue(plan: string): number {
  return PLAN_PRICES[plan] ?? 0;
}

async function listAllSubscriptions(stripe: ReturnType<typeof getStripeService>) {
  const all: any[] = [];
  let startingAfter: string | undefined;
  let truncated = false;
  for (let page = 0; page < SUB_PAGE_CAP; page++) {
    const res = await stripe.listSubscriptions({
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    } as any);
    all.push(...res.data);
    if (!res.has_more) {
      truncated = false;
      break;
    }
    startingAfter = res.data[res.data.length - 1]?.id;
    if (page === SUB_PAGE_CAP - 1) truncated = true;
  }
  return { subscriptions: all, truncated };
}

async function handleGet(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const rawRate = parseFloat(url.searchParams.get('conversionRate') || '');
  const assumedConversionRate =
    Number.isFinite(rawRate) && rawRate >= 0 && rawRate <= 1 ? rawRate : 0.2;

  const stripe = getStripeService();

  let subscriptions: any[] = [];
  let truncated = false;
  try {
    const result = await listAllSubscriptions(stripe);
    subscriptions = result.subscriptions;
    truncated = result.truncated;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to load subscriptions from Stripe: ${err.message}` },
      { status: 502 }
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // --- Enrichment data from the DB, keyed by stripe_customer_id / user id ---
  const customerIds = Array.from(
    new Set(
      subscriptions
        .map(s => (typeof s.customer === 'string' ? s.customer : s.customer?.id))
        .filter(Boolean)
    )
  );

  const profByCustomer = new Map<string, any>();
  const profById = new Map<string, any>();
  if (customerIds.length) {
    const { data: profiles } = await service
      .from('profiles')
      .select(
        'id,email,first_name,last_name,stripe_customer_id,credits_remaining,last_activity_at,subscription_plan,subscription_status'
      )
      .in('stripe_customer_id', customerIds);
    (profiles || []).forEach(p => {
      if (p.stripe_customer_id) profByCustomer.set(p.stripe_customer_id, p);
      profById.set(p.id, p);
    });
  }
  const relevantUserIds = Array.from(profById.keys());

  // Conversion fact: users who have ever paid for a subscription (amount > 0).
  const paidUserIds = new Set<string>();
  const firstSubChargeAt = new Map<string, string>();
  if (relevantUserIds.length) {
    const { data: payTxns } = await service
      .from('payment_transactions')
      .select('user_id, amount, created_at')
      .eq('payment_type', 'subscription')
      .in('user_id', relevantUserIds);
    (payTxns || []).forEach(t => {
      if ((t.amount || 0) > 0 && t.user_id) {
        paidUserIds.add(t.user_id);
        const prev = firstSubChargeAt.get(t.user_id);
        if (!prev || new Date(t.created_at) < new Date(prev)) {
          firstSubChargeAt.set(t.user_id, t.created_at);
        }
      }
    });
  }

  // Credit usage + tools used (negative credit_transactions = consumption).
  const usageByUser = new Map<
    string,
    { creditsUsed: number; tools: Set<string> }
  >();
  if (relevantUserIds.length) {
    const { data: txns } = await service
      .from('credit_transactions')
      .select('user_id, amount, transaction_type, operation, description')
      .in('user_id', relevantUserIds);
    (txns || []).forEach(t => {
      const amt = t.amount || 0;
      if (amt >= 0) return; // only consumption
      const u = usageByUser.get(t.user_id) || {
        creditsUsed: 0,
        tools: new Set<string>(),
      };
      u.creditsUsed += Math.abs(amt);
      const tool = (t.operation || t.transaction_type || '')
        .toString()
        .replace(/_/g, ' ')
        .trim();
      if (tool && tool !== 'deduction' && tool !== 'usage') u.tools.add(tool);
      usageByUser.set(t.user_id, u);
    });
  }

  // Uploaded image count (downloads are not tracked anywhere).
  const uploadsByUser = new Map<string, number>();
  if (relevantUserIds.length) {
    const { data: imgs } = await service
      .from('images')
      .select('user_id')
      .in('user_id', relevantUserIds);
    (imgs || []).forEach(i => {
      uploadsByUser.set(i.user_id, (uploadsByUser.get(i.user_id) || 0) + 1);
    });
  }

  const userInfo = (sub: any) => {
    const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    const p = cid ? profByCustomer.get(cid) : undefined;
    const usage = p ? usageByUser.get(p.id) : undefined;
    return {
      userId: p?.id || null,
      name:
        p && (p.first_name || p.last_name)
          ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
          : null,
      email: p?.email || null,
      creditsRemaining: p?.credits_remaining ?? null,
      lastActivityAt: p?.last_activity_at || null,
      creditsUsed: usage?.creditsUsed ?? 0,
      toolsUsed: usage ? Array.from(usage.tools) : [],
      uploadedFileCount: p ? uploadsByUser.get(p.id) || 0 : 0,
      downloadedFileCount: null as number | null, // not tracked
      hasPaid: p ? paidUserIds.has(p.id) : false,
      firstSubChargeAt: p ? firstSubChargeAt.get(p.id) || null : null,
    };
  };

  // --- Classify the trial funnel ---
  const trialSubs = subscriptions.filter(s => s.trial_start != null);

  const trialingUsers: any[] = [];
  const canceledTrials: any[] = [];
  const conversions: any[] = [];
  let expiredCount = 0;
  let paymentFailedCount = 0;

  for (const sub of trialSubs) {
    const info = userInfo(sub);
    const plan = planForSub(sub);
    const trialEnd = sub.trial_end as number | null;
    const trialStart = sub.trial_start as number | null;
    const daysRemaining =
      trialEnd != null ? Math.max(0, (trialEnd - nowSec) / DAY) : null;
    const monthlyValue = planValue(plan);
    const base = {
      subscriptionId: sub.id,
      plan,
      trialStart: trialStart ? new Date(trialStart * 1000).toISOString() : null,
      trialEnd: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      daysRemaining: daysRemaining != null ? Math.round(daysRemaining * 10) / 10 : null,
      cardOnFile: !!sub.default_payment_method,
      monthlyValue,
      cancellationReason: sub.cancellation_details?.feedback || null,
      ...info,
    };

    if (sub.status === 'trialing') {
      if (sub.cancel_at_period_end) {
        // Canceled but still inside the trial window — will not convert.
        canceledTrials.push({
          ...base,
          status: 'trial_canceled',
          canceledAt: sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : null,
          daysIntoTrial:
            trialStart && sub.canceled_at
              ? Math.round(((sub.canceled_at - trialStart) / DAY) * 10) / 10
              : null,
        });
      } else {
        const status =
          daysRemaining != null && daysRemaining <= 3
            ? 'trial_ending_soon'
            : 'active_trial';
        trialingUsers.push({ ...base, status });
      }
    } else if (info.hasPaid) {
      // Trial ended and the user paid at least once → converted.
      conversions.push({
        ...base,
        status: sub.status === 'active' ? 'converted' : 'converted_then_churned',
        convertedAt: info.firstSubChargeAt,
      });
    } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
      paymentFailedCount++;
      trialingUsers.push({ ...base, status: 'payment_failed' });
    } else if (sub.status === 'canceled') {
      const canceledDuringTrial =
        sub.canceled_at != null &&
        trialEnd != null &&
        sub.canceled_at <= trialEnd + DAY;
      if (canceledDuringTrial) {
        canceledTrials.push({
          ...base,
          status: 'trial_canceled',
          canceledAt: new Date(sub.canceled_at * 1000).toISOString(),
          daysIntoTrial:
            trialStart != null
              ? Math.round(((sub.canceled_at - trialStart) / DAY) * 10) / 10
              : null,
        });
      } else {
        // Trial ended without a payment and was later canceled/expired.
        expiredCount++;
      }
    } else {
      // incomplete / incomplete_expired etc. — trial never became a paid sub.
      expiredCount++;
    }
  }

  // --- Summary metrics ---
  const activeTrialList = trialingUsers.filter(
    t => t.status === 'active_trial' || t.status === 'trial_ending_soon'
  );
  const endingWithin = (days: number) =>
    activeTrialList.filter(
      t => t.daysRemaining != null && t.daysRemaining <= days
    ).length;

  const activeTrials = activeTrialList.length;
  const canceledTrialCount = canceledTrials.length;
  const conversionCount = conversions.length;
  const endedTrials =
    conversionCount + canceledTrialCount + expiredCount + paymentFailedCount;
  const historicalConversionRate =
    endedTrials > 0 ? conversionCount / endedTrials : null;

  const projectedTrialRevenue = activeTrialList.reduce(
    (s, t) => s + (t.monthlyValue || 0),
    0
  );

  // --- Active recurring subscriptions (from Stripe truth) ---
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pastDueSubs = subscriptions.filter(
    s => s.status === 'past_due' || s.status === 'unpaid'
  );
  const cancelingAtPeriodEnd = activeSubs.filter(s => s.cancel_at_period_end);
  const recentlyCanceled = subscriptions.filter(
    s =>
      s.status === 'canceled' &&
      s.canceled_at != null &&
      nowSec - s.canceled_at <= 30 * DAY
  );

  const planBreakdown: Record<string, { count: number; mrr: number }> = {};
  let activeMRR = 0;
  for (const s of activeSubs) {
    const plan = planForSub(s);
    const value = planValue(plan);
    activeMRR += value;
    planBreakdown[plan] = planBreakdown[plan] || { count: 0, mrr: 0 };
    planBreakdown[plan].count++;
    planBreakdown[plan].mrr += value;
  }

  const weightedTrialMRR = projectedTrialRevenue * assumedConversionRate;
  const totalProjectedMRR = activeMRR + weightedTrialMRR;
  const lostTrialRevenue = canceledTrials.reduce(
    (s, t) => s + (t.monthlyValue || 0),
    0
  );

  // --- Conversion insights ---
  const convertedDays = conversions
    .map(c =>
      c.convertedAt && c.trialStart
        ? (new Date(c.convertedAt).getTime() -
            new Date(c.trialStart).getTime()) /
          (1000 * DAY)
        : null
    )
    .filter((d): d is number => d != null && d >= 0);
  const avgDaysToConversion =
    convertedDays.length > 0
      ? Math.round(
          (convertedDays.reduce((a, b) => a + b, 0) / convertedDays.length) * 10
        ) / 10
      : null;

  const planConversionCounts: Record<string, number> = {};
  conversions.forEach(c => {
    planConversionCounts[c.plan] = (planConversionCounts[c.plan] || 0) + 1;
  });
  const mostConvertedPlan =
    Object.entries(planConversionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    null;

  const isInactive = (t: any) =>
    t.creditsUsed === 0 && t.uploadedFileCount === 0;
  const insights = {
    conversionRate: historicalConversionRate,
    avgDaysToConversion,
    mostConvertedPlan,
    // Among non-converters (canceled + active trials that haven't paid):
    highUsageNoConversion: canceledTrials.filter(t => t.creditsUsed >= 3).length,
    noActivity: [...activeTrialList, ...canceledTrials].filter(isInactive).length,
    usedCreditsNoSubscribe: canceledTrials.filter(t => t.creditsUsed > 0).length,
    uploadedNoDownload: [...activeTrialList, ...canceledTrials].filter(
      t => t.uploadedFileCount > 0
    ).length, // downloads not tracked, so this = uploaded-at-all
    dpiCheckerOnly: [...activeTrialList, ...canceledTrials].filter(
      t =>
        t.toolsUsed.length === 1 &&
        /dpi/i.test(t.toolsUsed[0] || '')
    ).length,
  };

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      assumedConversionRate,
      truncated,
      downloadsTracked: false,
    },
    summary: {
      activeTrials,
      endingIn24h: endingWithin(1),
      endingIn3d: endingWithin(3),
      endingIn7d: endingWithin(7),
      canceledTrials: canceledTrialCount,
      expiredTrials: expiredCount,
      paymentFailed: paymentFailedCount,
      conversions: conversionCount,
      conversionRate: historicalConversionRate,
      projectedTrialRevenue,
      activeMRR,
      totalProjectedMRR,
    },
    trialingUsers,
    canceledTrials,
    conversionInsights: insights,
    activeSubscriptions: {
      activePaidSubscribers: activeSubs.length,
      currentMRR: activeMRR,
      projectedARR: activeMRR * 12,
      planBreakdown,
      pastDue: pastDueSubs.length,
      cancelingAtPeriodEnd: cancelingAtPeriodEnd.length,
      recentlyCanceled: recentlyCanceled.length,
      list: activeSubs.map(s => {
        const info = userInfo(s);
        const plan = planForSub(s);
        return {
          subscriptionId: s.id,
          plan,
          monthlyValue: planValue(plan),
          cancelAtPeriodEnd: !!s.cancel_at_period_end,
          name: info.name,
          email: info.email,
        };
      }),
    },
    revenueProjections: {
      currentMRR: activeMRR,
      projectedMRRIfAllTrialsConvert: activeMRR + projectedTrialRevenue,
      weightedProjectedMRR: totalProjectedMRR,
      projectedARR: activeMRR * 12,
      projectedARRWithWeightedTrials: totalProjectedMRR * 12,
      lostTrialRevenue,
      assumedConversionRate,
      historicalConversionRate,
    },
  });
}

export const GET = withRateLimit(handleGet, 'api');
