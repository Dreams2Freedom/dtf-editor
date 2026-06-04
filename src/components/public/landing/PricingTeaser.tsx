import { Check, Info, Infinity as InfinityIcon, RotateCcw, ArrowRight } from 'lucide-react';
import styles from './PricingTeaser.module.css';

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
    tag: 'A quick test — not built for real jobs',
    features: ['2 credits per month', '48-hour file storage', 'Free DPI checker'],
    ctaLabel: 'Continue with Free',
    ctaVariant: 'ghost',
    ctaHref: '/auth/signup',
    muted: true,
  },
  {
    name: 'Hobbyist',
    price: '$9.99',
    unit: '/mo',
    tag: 'Best place to start fixing artwork',
    features: [
      '20 credits per month',
      'Unlimited storage while subscribed',
      'All artwork tools',
      '7-day money-back guarantee',
    ],
    ctaLabel: 'Start a Hobbyist Trial',
    ctaVariant: 'primary',
    ctaHref: '/auth/signup?plan=hobbyist',
    note: '7-day trial · cancel anytime',
    featured: true,
    flag: 'Most popular',
  },
  {
    name: 'Small Business',
    price: '$24.99',
    unit: '/mo',
    tag: 'For higher-volume shops',
    features: [
      '60 credits per month',
      'Unlimited storage while subscribed',
      'Priority & batch features',
    ],
    ctaLabel: 'Start a Small Business Trial',
    ctaVariant: 'blue',
    ctaHref: '/auth/signup?plan=small-business',
  },
  {
    name: 'Pay As You Go',
    price: '$7.99',
    unit: '+ packs',
    tag: 'No subscription required',
    features: [
      'Credit packs from $7.99',
      'Purchased credits never expire',
      '90-day storage from last purchase',
    ],
    ctaLabel: 'Buy credits',
    ctaVariant: 'ghost',
    ctaHref: '/auth/signup?next=%2Fpricing%3Ftab%3Dpayasyougo',
  },
];

export function PricingTeaser() {
  return (
    <section className="section section--tint" id="pricing">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">Pricing</span>
          <h2 className="h-sec">Start a trial, scale when you grow</h2>
          <p className="sub">
            Most creators start with a Hobbyist trial and process real artwork
            right away. The free plan is just a quick look at the tools.
          </p>
        </div>

        <div className={styles.pricing__grid}>
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`${styles.plan} ${plan.featured ? styles['plan--feat'] : ''} ${
                plan.muted ? styles['plan--muted'] : ''
              }`}
            >
              {plan.flag && <span className={styles.plan__flag}>{plan.flag}</span>}
              <div className={styles.plan__name}>{plan.name}</div>
              <div className={styles.plan__price}>
                <b>{plan.price}</b>
                <span>{plan.unit}</span>
              </div>
              <div className={styles.plan__tag}>{plan.tag}</div>
              <ul className={styles.plan__list}>
                {plan.features.map(f => (
                  <li key={f}>
                    <Check size={16} aria-hidden="true" /> {f}
                  </li>
                ))}
              </ul>
              <a className={`btn btn--${plan.ctaVariant} btn--block`} href={plan.ctaHref}>
                {plan.ctaLabel}
              </a>
              {plan.note && <p className={styles.plan__note}>{plan.note}</p>}
            </div>
          ))}
        </div>

        <div className={styles.pricing__note}>
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
        <div className={styles.pricing__more}>
          <a className="btn btn--link" href="/pricing">
            See full pricing details <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
