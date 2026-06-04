import {
  UploadCloud,
  SlidersHorizontal,
  Download,
  Coins,
  Check,
  CircleCheck,
} from 'lucide-react';
import styles from './PrintShopExplainer.module.css';

const STEPS = [
  {
    icon: UploadCloud,
    title: 'Upload your artwork',
    copy: 'Start with a PNG, JPG, or WebP file. DTF Editor helps you identify the next best step before your artwork becomes a bad print.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Pick the right tool',
    copy: 'Remove a background, upscale a low-resolution file, vectorize a logo, generate artwork, or check DPI with a workflow built around DTF printing.',
  },
  {
    icon: Download,
    title: 'Export cleaner artwork',
    copy: 'Download improved files that are easier to use in your DTF transfer workflow, including transparent PNGs and print-quality guidance.',
  },
];

const CREDIT_NOTES = [
  "Monthly credits don't roll over",
  'Purchased credits never expire',
  'Failed processing automatically refunds the credit',
];

export function PrintShopExplainer() {
  return (
    <section className="section" id="how-it-works">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">How it works</span>
          <h2 className="h-sec">
            Built by print shop owners who know what goes wrong before a print
          </h2>
          <p className="sub">
            DTF Editor helps you upload, fix, check, and export artwork with a
            simple workflow built for DTF transfers.
          </p>
        </div>

        <div className={styles.steps}>
          {STEPS.map(({ icon: Icon, title, copy }, i) => (
            <div key={title} className={styles.ecard}>
              <div className={styles.ecard__ic}>
                <Icon size={20} aria-hidden="true" />
              </div>
              <span className={styles.ecard__step}>Step {i + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
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
