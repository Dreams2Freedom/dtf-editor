import styles from './HowItWorks.module.css';

const STEPS = [
  {
    n: 1,
    title: 'Upload your artwork',
    body: 'PNG, JPG, or WebP files are supported. Drag it in or browse from your device.',
  },
  {
    n: 2,
    title: 'Pick the tool you need',
    body: 'Remove a background, upscale, vectorize, generate, or check DPI — guided every step.',
  },
  {
    n: 3,
    title: 'Download your improved file',
    body: 'Get cleaner artwork ready for your next DTF transfer workflow.',
  },
];

export function HowItWorks() {
  return (
    <section className="section section--tint">
      <div className="wrap">
        <div className="section-head section-head--center">
          <h2 className="h-sec">From rough artwork to print-ready in minutes</h2>
          <p className="sub">
            No design experience required. DTF Editor walks you through every
            step.
          </p>
        </div>
        <div className={styles.steps}>
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className={styles.step}>
              <div className={styles.step__n}>{n}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
