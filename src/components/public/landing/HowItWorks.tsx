import { UploadCloud, SlidersHorizontal, Download } from 'lucide-react';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    icon: UploadCloud,
    title: 'Upload your artwork',
    copy: 'Start with a PNG, JPG, or WebP file.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Pick the right tool',
    copy: 'Remove a background, upscale, vectorize, generate, or check DPI.',
  },
  {
    icon: Download,
    title: 'Export your image',
    copy: 'Download cleaner artwork with guidance for print quality.',
  },
];

export function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="wrap">
        <div className="section-head section-head--center">
          <span className="eyebrow">How it works</span>
          <h2 className="h-sec">Upload, choose a tool, and export cleaner artwork</h2>
          <p className="sub">
            DTF Editor keeps artwork prep simple. Start with your file, pick the
            fix you need, and download a cleaner version for your DTF workflow.
          </p>
        </div>

        <div className={styles.steps}>
          {STEPS.map(({ icon: Icon, title, copy }, i) => (
            <div key={title} className={styles.step}>
              <div className={styles.step__top}>
                <span className={styles.step__n}>{i + 1}</span>
                <span className={styles.step__ic}>
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
