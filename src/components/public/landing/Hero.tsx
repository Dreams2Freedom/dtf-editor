import { CircleCheck, Shirt, Layers, Gauge, Sparkles } from 'lucide-react';
import { ProductDemoAnimation } from './ProductDemoAnimation';
import styles from './Hero.module.css';

const TRUST = [
  { icon: Shirt, label: 'Built for DTF artwork' },
  { icon: Layers, label: 'Transparent PNG output' },
  { icon: Gauge, label: '300 DPI guidance' },
  { icon: Sparkles, label: 'Beginner-friendly' },
];

export function Hero() {
  return (
    <section className={`wrap ${styles.hero}`}>
      <div className={styles.hero__inner}>
        <span className="eyebrow">AI artwork prep for DTF transfers</span>
        <h1 className={styles.hero__title}>
          Fix Your Artwork <em>Before</em> You Print
        </h1>
        <p className={styles.hero__sub}>
          Drop in your design, remove backgrounds, sharpen low-resolution files,
          check DPI, and download cleaner, print-ready artwork — with a simple
          guided workflow built for DTF transfers.
        </p>
        <div className={styles.hero__cta}>
          <a className="btn btn--primary btn--lg" href="/auth/signup">
            Start a Hobbyist Trial
          </a>
          <a className="btn btn--ghost btn--lg" href="#dpi">
            Check DPI Free
          </a>
        </div>
        <p className={styles.hero__note}>
          <CircleCheck size={15} aria-hidden="true" /> Free DPI checker available
          instantly · Full tools unlock after signup
        </p>
        <ul className={styles.hero__trust}>
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label}>
              <Icon size={15} aria-hidden="true" /> {label}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles['hero__demo-wrap']}>
        <ProductDemoAnimation />
        <div className={styles['hero__demo-cta']}>
          <a className="btn btn--primary btn--lg" href="/auth/signup">
            Start a Hobbyist Trial
          </a>
          <p className={styles['hero__demo-note']}>
            See it work on your own artwork —{' '}
            <a href="/auth/signup">start a trial or create an account</a>. The
            free DPI checker works without signup.
          </p>
        </div>
      </div>
    </section>
  );
}
