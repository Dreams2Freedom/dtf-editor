/**
 * Shared helpers for the 7-day paid-trial experience (Basic & Starter).
 *
 * Design decisions (see implementation report):
 * - Trial length is 7 days; only Basic and Starter are offered as trials.
 *   Professional is offered as a normal subscription ("Choose Professional").
 * - Eligibility is "one trial per user, ever": a user is eligible only while
 *   they're on Free AND have never had a paid subscription (no Stripe
 *   subscription id and no prior cancellation on record). This is enforced
 *   again server-side in the checkout route so a trial can never be granted
 *   twice, regardless of what the client requests.
 * - The once-per-free-cycle upgrade prompt tracks dismissal in localStorage,
 *   keyed to the current cycle (year-month), so it doesn't nag every page load
 *   but returns next cycle. No DB schema change required.
 */

export const TRIAL_DAYS = 7;

// Plan keys eligible for the trial offer.
export const TRIAL_PLAN_IDS = ['basic', 'starter'] as const;
export type TrialPlanId = (typeof TRIAL_PLAN_IDS)[number];

// Single source of truth for the legally-required trial disclosure. Shown
// wherever the user actually makes the trial decision.
export const TRIAL_DISCLOSURE =
  '7-day trial requires a payment method. Billing starts after the trial unless canceled.';

export function isTrialPlan(planId?: string | null): planId is TrialPlanId {
  return !!planId && (TRIAL_PLAN_IDS as readonly string[]).includes(planId);
}

/**
 * Minimal shape of the fields we read off a profile to decide eligibility.
 * (The real profile row has many more columns; we only touch these.)
 */
export interface TrialEligibilityProfile {
  subscription_plan?: string | null;
  subscription_status?: string | null;
  stripe_subscription_id?: string | null;
  subscription_canceled_at?: string | null;
}

/**
 * "One trial per user, ever": eligible only while on Free and with no sign of a
 * past subscription. A free user who previously subscribed/canceled (and thus
 * has a stripe_subscription_id or a cancellation timestamp) is NOT eligible and
 * should see normal Subscribe CTAs instead.
 */
export function isTrialEligible(
  profile?: TrialEligibilityProfile | null
): boolean {
  if (!profile) return false;
  const plan = (profile.subscription_plan || 'free').toLowerCase();
  const status = (profile.subscription_status || '').toLowerCase();
  const onFree = plan === 'free' || plan === '';
  // Currently trialing/active counts as having a subscription.
  const looksSubscribed =
    !!profile.stripe_subscription_id ||
    !!profile.subscription_canceled_at ||
    status === 'trialing' ||
    status === 'active' ||
    status === 'past_due';
  return onFree && !looksSubscribed;
}

/** Identifier for the user's current free cycle (calendar month proxy). */
export function freeCycleKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const dismissKey = (userId: string) => `dtf_trial_prompt_dismissed_${userId}`;

/** Returns true if the free-cycle upgrade prompt was already dismissed this cycle. */
export function isPromptDismissedThisCycle(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return window.localStorage.getItem(dismissKey(userId)) === freeCycleKey();
  } catch {
    return false;
  }
}

/** Records that the user dismissed the prompt for the current free cycle. */
export function dismissPromptForCycle(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(dismissKey(userId), freeCycleKey());
  } catch {
    /* ignore storage failures (private mode, quota) */
  }
}
