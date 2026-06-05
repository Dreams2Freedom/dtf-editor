'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Minus,
  ChevronDown,
  Info,
  Infinity as InfinityIcon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { SiteHeader } from '@/components/public/landing/SiteHeader';
import { SiteFooter } from '@/components/public/landing/SiteFooter';
import { COMPARISON_FEATURES } from '@/lib/publicData';
import card from '@/components/public/landing/PricingTeaser.module.css';
import styles from './PublicPricingDetails.module.css';
import '@/components/public/landing/landing.css';

/* ----------------------------- Pricing data -----------------------------
   Source of truth for the public pricing details page (matches the Stripe
   plans in services/stripe.ts). CTAs route public visitors to sign up; the
   existing signup -> checkout handoff carries the chosen plan. No Stripe
   price/product IDs or checkout logic live here. */

type Plan = {
  name: string;
  price: string;
  unit: string;
  tag?: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: 'primary' | 'blue' | 'ghost';
  ctaHref: string;
  featured?: boolean;
  muted?: boolean;
  flag?: string;
};

const SUBSCRIPTION_PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    unit: '/mo',
    tag: 'Try the tools',
    features: ['2 credits per month', 'All basic features', 'Email support'],
    ctaLabel: 'Get Started Free',
    ctaVariant: 'ghost',
    ctaHref: '/auth/signup',
    muted: true,
  },
  {
    name: 'Basic',
    price: '$9.99',
    unit: '/mo',
    tag: 'Best place to start',
    features: [
      '20 credits per month',
      'All features',
      'Priority support',
      'HD downloads',
    ],
    ctaLabel: 'Subscribe Now',
    ctaVariant: 'primary',
    ctaHref: '/auth/signup?plan=basic',
    featured: true,
    flag: 'Popular',
  },
  {
    name: 'Starter',
    price: '$24.99',
    unit: '/mo',
    tag: 'For growing shops',
    features: [
      '60 credits per month',
      'All features',
      'Priority support',
      'HD downloads',
      'Bulk processing (coming soon)',
    ],
    ctaLabel: 'Subscribe Now',
    ctaVariant: 'blue',
    ctaHref: '/auth/signup?plan=starter',
    flag: 'Best Value',
  },
  {
    name: 'Professional',
    price: '$49.99',
    unit: '/mo',
    tag: 'For high-volume shops',
    features: [
      '150 credits per month',
      'All features',
      'Priority support',
      'HD downloads',
      'Bulk processing (coming soon)',
    ],
    ctaLabel: 'Subscribe Now',
    ctaVariant: 'blue',
    ctaHref: '/auth/signup?plan=professional',
    flag: 'Professional',
  },
];

const PAYG_HREF = '/auth/signup?next=%2Fpricing%3Ftab%3Dpayasyougo';

const PAYG_PACKS: Plan[] = [
  {
    name: '10 Credits',
    price: '$7.99',
    unit: 'one-time',
    tag: '$0.80 per credit',
    features: [
      'One-time purchase',
      'No recurring charges',
      'Credits never expire',
    ],
    ctaLabel: 'Buy 10 Credits',
    ctaVariant: 'blue',
    ctaHref: PAYG_HREF,
  },
  {
    name: '20 Credits',
    price: '$14.99',
    unit: 'one-time',
    tag: '$0.75 per credit',
    features: [
      'One-time purchase',
      'No recurring charges',
      'Credits never expire',
    ],
    ctaLabel: 'Buy 20 Credits',
    ctaVariant: 'primary',
    ctaHref: PAYG_HREF,
    featured: true,
    flag: 'Popular',
  },
  {
    name: '50 Credits',
    price: '$29.99',
    unit: 'one-time',
    tag: '$0.60 per credit',
    features: [
      'One-time purchase',
      'No recurring charges',
      'Credits never expire',
    ],
    ctaLabel: 'Buy 50 Credits',
    ctaVariant: 'blue',
    ctaHref: PAYG_HREF,
    flag: 'Best Value',
  },
];

const RULES: string[] = [
  'Paid tools use credits — background removal, upscaling, vectorization, and AI generation.',
  'The Free DPI Checker is always free and never uses credits.',
  'Subscription plans include monthly credits.',
  'Pay As You Go credits are one-time purchases.',
  'Pay As You Go credits never expire.',
  'Failed processing automatically refunds the credit.',
];

type ToolRow = {
  tool: string;
  cost: string;
  costKind: 'free' | 'paid';
  access: string;
  notes: string;
};

const TOOL_ROWS: ToolRow[] = [
  { tool: 'Free DPI Checker', cost: '0 credits', costKind: 'free', access: 'Public / free', notes: 'Always free' },
  { tool: 'Background Removal', cost: '1 credit', costKind: 'paid', access: 'Plan or credit pack', notes: 'Removes backgrounds' },
  { tool: 'Image Upscaling', cost: '1 credit', costKind: 'paid', access: 'Plan or credit pack', notes: 'Improves low-resolution artwork' },
  { tool: 'Vectorization', cost: '1 credit', costKind: 'paid', access: 'Plan or credit pack', notes: 'Converts graphics to cleaner scalable artwork' },
  { tool: 'AI Image Generation', cost: '1 credit · HD may cost 2', costKind: 'paid', access: 'Paid only', notes: 'Creates artwork from prompts' },
];

const FAQS = [
  {
    q: 'Do monthly credits roll over?',
    a: 'No. Credits included with a monthly plan refresh each month and do not carry over. If you process artwork occasionally, Pay As You Go credit packs are a better fit because they never expire.',
  },
  {
    q: 'Can I buy credits without a subscription?',
    a: 'Yes. Pay As You Go credit packs let you buy credits without a monthly plan — $7.99 for 10, $14.99 for 20, or $29.99 for 50 — and redeem them on the paid tools whenever you need them.',
  },
  {
    q: 'Do purchased credits expire?',
    a: 'No. Credits bought as Pay As You Go packs never expire. Your file storage stays active for 90 days from your last purchase.',
  },
  {
    q: 'What happens if processing fails?',
    a: "If a tool fails to process your file, the credit is automatically refunded to your account. You're never charged for a result you didn't get.",
  },
  {
    q: 'Is the DPI Checker free?',
    a: 'Yes. The Free DPI Checker is always free and never uses credits — check artwork resolution as often as you like.',
  },
  {
    q: 'Which plan should I start with?',
    a: 'Most people start with Basic ($9.99/mo, 20 credits) — it unlocks every paid tool. Move up to Starter (60 credits) or Professional (150 credits) for more monthly credits and bulk processing.',
  },
];

const COMPARE_COLS = ['free', 'basic', 'starter', 'professional'] as const;

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`${card.plan} ${plan.featured ? card['plan--feat'] : ''} ${
        plan.muted ? card['plan--muted'] : ''
      }`}
    >
      {plan.flag && <span className={card.plan__flag}>{plan.flag}</span>}
      <div className={card.plan__name}>{plan.name}</div>
      <div className={card.plan__price}>
        <b>{plan.price}</b>
        <span>{plan.unit}</span>
      </div>
      {plan.tag && <div className={card.plan__tag}>{plan.tag}</div>}
      <ul className={card.plan__list}>
        {plan.features.map(f => (
          <li key={f}>
            <Check size={16} aria-hidden="true" /> {f}
          </li>
        ))}
      </ul>
      <a className={`btn btn--${plan.ctaVariant} btn--block`} href={plan.ctaHref}>
        {plan.ctaLabel}
      </a>
    </div>
  );
}

function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState(0);

  useEffect(() => {
    setMaxH(open && ref.current ? ref.current.scrollHeight : 0);
  }, [open]);

  return (
    <div className={`${styles.acc} ${open ? styles['is-open'] : ''}`}>
      <button className={styles.acc__q} aria-expanded={open} onClick={() => setOpen(v => !v)}>
        {q}
        <ChevronDown size={20} aria-hidden="true" />
      </button>
      <div ref={ref} className={styles.acc__a} style={{ maxHeight: `${maxH}px` }}>
        <p>{a}</p>
      </div>
    </div>
  );
}

export function PublicPricingDetails() {
  const [tab, setTab] = useState<'subscription' | 'payg'>('subscription');

  // Allow /pricing?tab=payasyougo to open the Pay As You Go tab directly.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'payasyougo' || t === 'payg') setTab('payg');
  }, []);

  return (
    <div className="dtfLanding" id="top">
      <SiteHeader />

      <main>
        {/* Compact hero + tabs + active cards */}
        <section className={`section ${styles.pricingTop}`}>
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow">Pricing</span>
              <h1 className="h-sec">Simple pricing that grows with you</h1>
              <p className="sub">Start free. Upgrade when you need more.</p>
            </div>

            <div className={styles.tabsWrap}>
              <div className={styles.tabs} role="tablist" aria-label="Pricing options">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'subscription'}
                  className={`${styles.tab} ${tab === 'subscription' ? styles.tabActive : ''}`}
                  onClick={() => setTab('subscription')}
                >
                  Subscription Plans
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'payg'}
                  className={`${styles.tab} ${tab === 'payg' ? styles.tabActive : ''}`}
                  onClick={() => setTab('payg')}
                >
                  Pay As You Go
                </button>
              </div>
            </div>

            {tab === 'subscription' ? (
              <div className={card.pricing__grid}>
                {SUBSCRIPTION_PLANS.map(plan => (
                  <PlanCard key={plan.name} plan={plan} />
                ))}
              </div>
            ) : (
              <div className={styles.paygGrid}>
                {PAYG_PACKS.map(plan => (
                  <PlanCard key={plan.name} plan={plan} />
                ))}
              </div>
            )}

            <div className={card.pricing__note}>
              <span>
                <Info size={14} aria-hidden="true" /> Monthly credits don&apos;t roll over
              </span>
              <span>
                <InfinityIcon size={14} aria-hidden="true" /> Purchased credits never expire
              </span>
              <span>
                <RotateCcw size={14} aria-hidden="true" /> Auto-refund on processing failure
              </span>
            </div>
          </div>
        </section>

        {/* How credits work */}
        <section className="section section--tint">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow">How credits work</span>
              <h2 className="h-sec">Pay for the tools you actually use</h2>
            </div>

            <div className={styles.credits}>
              <div className={styles.credits__copy}>
                <p>
                  Credits are used to run paid tools like background removal,
                  image upscaling, vectorization, and AI image generation.
                  Subscription plans include credits each month. If you do not
                  want a monthly subscription, you can buy Pay As You Go credit
                  packs instead. The Free DPI Checker does not require credits.
                </p>
              </div>

              <ul className={styles.rules}>
                {RULES.map(text => (
                  <li key={text}>
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tool credit costs */}
            <div className="section-head section-head--center" style={{ marginTop: 48 }}>
              <h3 className="h-sec">What each tool costs</h3>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Credit cost</th>
                    <th>Access</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOL_ROWS.map(row => (
                    <tr key={row.tool}>
                      <td className={styles.tool}>{row.tool}</td>
                      <td>
                        <span
                          className={`${styles.cost} ${
                            row.costKind === 'free' ? styles['cost--free'] : styles['cost--paid']
                          }`}
                        >
                          {row.cost}
                        </span>
                      </td>
                      <td>{row.access}</td>
                      <td>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Plan comparison */}
        <section className="section">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow">Compare plans</span>
              <h2 className="h-sec">What&apos;s included in each plan</h2>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free</th>
                    <th className={styles.colFeat}>Basic</th>
                    <th>Starter</th>
                    <th>Professional</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map(feature => (
                    <tr key={feature.name}>
                      <td>{feature.name}</td>
                      {COMPARE_COLS.map(col => {
                        const v = feature[col];
                        return (
                          <td key={col} className={col === 'basic' ? styles.colFeat : ''}>
                            {v === true ? (
                              <Check size={16} className={styles.ok} aria-label="Included" />
                            ) : v === false ? (
                              <Minus size={16} className={styles.no} aria-label="Not included" />
                            ) : (
                              <span>{v}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section section--tint">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow">Pricing FAQ</span>
              <h2 className="h-sec">Questions about pricing</h2>
            </div>
            <div className={styles.faq}>
              {FAQS.map((item, i) => (
                <FaqRow key={item.q} q={item.q} a={item.a} defaultOpen={i === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="section">
          <div className="wrap">
            <div className={styles.finalCta}>
              <h2>Start cleaning up artwork today</h2>
              <p>
                Start free and upgrade whenever you need more, or check your DPI
                for free first.
              </p>
              <div className={styles.finalCta__actions}>
                <a className="btn btn--primary btn--lg" href="/auth/signup">
                  <Sparkles size={18} aria-hidden="true" /> Get Started Free
                </a>
                <Link className="btn btn--ghost btn--lg" href="/#dpi">
                  Check DPI Free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
