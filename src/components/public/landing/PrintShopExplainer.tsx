import { Coins, Check, CircleCheck } from 'lucide-react';
import styles from './PrintShopExplainer.module.css';

const CREDIT_NOTES = [
  "Monthly credits don't roll over",
  'Purchased credits never expire',
  'Failed processing automatically refunds the credit',
];

export function PrintShopExplainer() {
  return (
    <section className="section" id="why-dtf-editor">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">Built for print shops</span>
          <h2 className="h-sec">
            Built by print shop owners who know what goes wrong before a print
          </h2>
          <p className="sub">
            DTF Editor was created to make artwork prep easier for creators,
            hobbyists, and small shops — with a simple, credit-based workflow.
          </p>
        </div>

        <div className={styles.credits}>
          <div className={styles.credits__intro}>
            <div className={styles.credits__head}>
              <span className={styles.credits__ic}>
                <Coins size={18} aria-hidden="true" />
              </span>
              <h3>How credits work</h3>
            </div>
            <p>
              Credits are used when you run a paid processing tool like
              background removal, upscaling, vectorization, or AI image
              generation. The Free DPI Checker is always free and never uses a
              credit.
            </p>
            <span className={styles.credits__free}>
              <CircleCheck size={14} aria-hidden="true" /> Free DPI Checker — no
              credit, no signup
            </span>
          </div>

          <ul className={styles.credits__list}>
            {CREDIT_NOTES.map(note => (
              <li key={note}>
                <Check size={15} aria-hidden="true" /> {note}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.explainer__cta}>
          <a className="btn btn--primary btn--lg" href="/auth/signup">
            Start a Hobbyist Trial
          </a>
          <a className="btn btn--ghost btn--lg" href="#dpi">
            Check DPI Free
          </a>
        </div>
      </div>
    </section>
  );
}
