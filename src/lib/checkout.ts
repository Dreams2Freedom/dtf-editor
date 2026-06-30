/**
 * Client helper to start Stripe Checkout for a subscription plan, optionally as
 * a 7-day trial. Resolves the Stripe price id via the existing /api/stripe/pricing
 * endpoint (so price IDs are never hard-coded on the client) and posts to the
 * existing /api/stripe/create-checkout-session route. The server re-validates
 * trial eligibility, so passing `trial: true` is always safe.
 */
export async function startPlanCheckout(
  planId: string,
  opts: { trial?: boolean } = {}
): Promise<{ url?: string; error?: string }> {
  try {
    const pricingRes = await fetch('/api/stripe/pricing');
    if (!pricingRes.ok) return { error: 'Could not load plan pricing.' };
    const pricing = await pricingRes.json();
    const plan = (pricing.subscriptionPlans || []).find(
      (p: { id: string; stripePriceId?: string }) => p.id === planId
    );
    if (!plan?.stripePriceId) return { error: 'Plan is not available.' };

    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: plan.stripePriceId,
        mode: 'subscription',
        trial: !!opts.trial,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || 'Could not start checkout.' };
    }
    const data = await res.json();
    return { url: data.url };
  } catch {
    return { error: 'Something went wrong starting checkout.' };
  }
}
