import styles from './FinalCta.module.css';

export function FinalCta() {
  return (
    <section className={styles.final}>
      <div className={`wrap ${styles.final__inner}`}>
        <h2>Fix your artwork before you print</h2>
        <p>
          Start with a guided workflow built for DTF transfers — or use the free
          DPI checker to test your artwork first.
        </p>
        <div className={styles.final__cta}>
          <a className={`btn btn--lg ${styles['btn--blue2']}`} href="/auth/signup">
            Start a Hobbyist Trial
          </a>
          <a className={`btn btn--lg ${styles['btn--ghostw']}`} href="#dpi">
            Check DPI Free
          </a>
        </div>
      </div>
    </section>
  );
}
