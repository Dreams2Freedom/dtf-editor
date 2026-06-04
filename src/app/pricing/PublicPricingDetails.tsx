'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Info,
  Infinity as InfinityIcon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SiteHeader } from '@/components/public/landing/SiteHeader';
import { SiteFooter } from '@/components/public/landing/SiteFooter';
import card from '@/components/public/landing/PricingTeaser.module.css';
import styles from './PublicPricingDetails.module.css';
import '@/components/public/landing/landing.css';

/* ----------------------------- Pricing data -----------------------------
   Source of truth for the public pricing details page. Kept here in one
   place so values are easy to update. Note: monthly checkout itself is
   handled elsewhere (logged-in SubscriptionPlans / Stripe) — these CTAs
   route public visitors to sign up. */

type Plan = {
  name: string;
  price: string;
  unit: string;
  tag: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: 'primary' | 'blue' | 'ghost';
  ctaHref: string;
  note?: string;
  featured?: boolean;
  muted?: boolean;
  flag?: string;
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    unit: '/mo',
    tag: 'A quick look at the tools',
    features: [
      '2 credits per month',
      '48-hour file storage',
      'Free DPI Checker',
      'Good for testing the tools',
    ],
    ctaLabel: 'Start Free',
    ctaVariant: 'ghost',
    ctaHref: '/auth/signup',
    muted: true,
  },
  {
    name: 'Starter',
    price: '$9.99',
    unit: '/mo',
    tag: 'Best place to start',
    features: [
      '20 credits per month',
      'Unlimited storage while subscribed',
      'All paid artwork tools',
      '7-day money-back guarantee',
    ],
    ctaLabel: 'Start a Starter Trial',
    ctaVariant: 'primary',
    ctaHref: '/auth/signup',
    note: '7-day money-back guarantee',
    featured: true,
    flag: 'Recommended',
  },
  {
    name: 'Pro',
    price: '$19.99',
    unit: '/mo',
    tag: 'More credits + priority',
    features: [
      '50 credits per month',
      'Unlimited storage while subscribed',
      'Priority & batch features',
    ],
    ctaLabel: 'Choose Pro',
    ctaVariant: 'blue',
    ctaHref: '/auth/signup',
  },
  {
    name: 'Pay As You Go',
    price: '$7.99',
    unit: '+ packs',
    tag: 'No subscription needed',
    features: [
      'Credit packs from $7.99',
      'Purchased credits never expire',
      '90-day storage from last purchase',
    ],
    ctaLabel: 'Buy credit packs',
    ctaVariant: 'ghost',
    ctaHref: '/auth/signup',
  },
];

const CREDIT_PACKS = [
  { credits: 10, price: '$7.99', per: '$0.80 / credit' },
  { credits: 20, price: '$14.99', per: '$0.75 / credit', flag: 'Popular' },
  { credits: 50, price: '$29.99', per: '$0.60 / credit', flag: 'Best value' },
];

const RULES = [
  {
    text: <><b>Monthly credits do not roll over</b> — each plan refreshes its credits every month.</>,
  },
  {
    text: <><b>Purchased credits never expire</b> — Pay As You Go credits stay until you use them.</>,
  },
  {
    text: <><b>The Free DPI Checker is always free</b> and never uses credits.</>,
  },
  {
    text: <><b>Paid tools use credits</b> — background removal, upscaling, vectorization, and AI generation.</>,
  },
  {
    text: <><b>7-day money-back guarantee</b> on monthly plans.</>,
  },
  {
    text: <><b>Auto-refund on failure</b> — if a job fails to process, the credit is returned automatically.</>,
  },
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
    a: 'Most people start with Starter ($9.99/mo, 20 credits) — it unlocks every paid tool and includes a 7-day money-back guarantee. Move up to Pro for more monthly credits and priority/batch features.',
  },
];

function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState(0);

  useEffect(() => {
    setMaxH(open && ref.current ? ref.current.scrollHeight : 0);
  }, [open]);

  return (
    <div className={`${styles.acc} ${open ? styles['is-open'] : ''}`}>
      <button
        className={styles.acc__q}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
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
  return (
    <div className="dtfLanding" id="top">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="section">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow">Pricing</span>
              <h1 className="h-sec">Simple pricing for cleaner DTF artwork</h1>
              <p className="sub">
                Start free, choose a monthly plan, or buy credits only when you
                need them.
              </p>
            </div>

            {/* Plan cards */}
            <div className={card.pricing__grid}>
              {PLANS.map(plan => (
                <div
                  key={plan.name}
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
                  <div className={card.plan__tag}>{plan.tag}</div>
                  <ul className={card.plan__list}>
                    {plan.features.map(f => (
                      <li key={f}>
                        <Check size={16} aria-hidden="true" /> {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    className={`btn btn--${plan.ctaVariant} btn--block`}
                    href={plan.ctaHref}
                  >
                    {plan.ctaLabel}
                  </a>
                  {plan.note && <p className={card.plan__note}>{plan.note}</p>}
                </div>
              ))}
            </div>

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
                  Credits are used to run specific tools inside DTF Editor, such
                  as background removal, image upscaling, vectorization, and AI
                  image generation. If you do not want a monthly plan, you can
                  buy credit packs instead and redeem those credits for the
                  tools you need.
                </p>
                <p>
                  The Free DPI Checker does not require credits — it&apos;s
                  always free, so you can check artwork resolution as often as
                  you like.
                </p>
              </div>

              <ul className={styles.rules}>
                {RULES.map((r, i) => (
                  <li key={i}>
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Credit packs */}
            <div className="section-head section-head--center" style={{ marginTop: 48 }}>
              <h3 className="h-sec">Pay-as-you-go credit packs</h3>
              <p className="sub">No subscription required — buy credits when you need them.</p>
            </div>
            <div className={styles.packs}>
              {CREDIT_PACKS.map(pack => (
                <div
                  key={pack.credits}
                  className={`${styles.pack} ${pack.flag === 'Best value' ? styles['pack--feat'] : ''}`}
                >
                  {pack.flag && <span className={styles.pack__flag}>{pack.flag}</span>}
                  <div className={styles.pack__credits}>{pack.credits} credits</div>
                  <div className={styles.pack__price}>{pack.price}</div>
                  <div className={styles.pack__per}>{pack.per}</div>
                </div>
              ))}
            </div>
            <p className={styles.packs__note}>
              Purchased credits never expire · storage stays active for 90 days
              from your last purchase.
            </p>
          </div>
        </section>

        {/* Tool credit table */}
        <section className="section">
          <div className="wrap">
            <div className="section-head section-head--center">
              <span className="eyebrow">Tool credits</span>
              <h2 className="h-sec">What each tool costs</h2>
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
                Begin with a Starter trial and process real artwork right away,
                or check your DPI for free first.
              </p>
              <div className={styles.finalCta__actions}>
                <a className="btn btn--primary btn--lg" href="/auth/signup">
                  <Sparkles size={18} aria-hidden="true" /> Start a Starter Trial
                </a>
                <a className="btn btn--ghost btn--lg" href="/free-dpi-checker">
                  Check DPI Free
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
